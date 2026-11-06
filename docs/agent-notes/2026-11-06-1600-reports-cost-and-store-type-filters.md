# Cost and store type filters on Laporan Maintenance

## Scope

Add two filters to `/dashboard/reports` (table "+ Filter" menu, URL params and
the Ekspor XLSX dialog) for ADMIN, BMC and BNM_MANAGER:

- **Biaya** (`?cost=with_cost|no_cost`): "Ada biaya" = `totalEstimation > 0`,
  "Tanpa biaya" = `totalEstimation <= 0`, matching the existing zero-cost rule
  (`totalEstimation === 0`) used by the start-work flow.
- **Tipe Toko** (`?storeType=REGULAR|FRANCHISE|UNKNOWN`): Alfamart store
  ownership from `Store.ownershipType`. Only offered when Brand = Alfamart.

Preventive / PJUM / material exports and other pages using
`STORE_BRAND_OPTIONS` are unchanged.

## Context and Sources

- `Store.ownershipType` (`StoreOwnershipType` enum) already filled by
  `lib/jobs/sync-stores.ts` / `sync-store-enrichment.ts`; PJUM PDF breakdown
  (`lib/pdf/pjum-store-type-breakdown.ts`) groups Alfamart Reguler /
  Franchise / Lawson / Alfamart unknown the same way.
- `components/reui/filters.tsx`: fields are recomputed each render, so a field
  can be shown conditionally.

## Changed Files

- `lib/report-cost-filter.ts`: new cost filter type, options, parser, where.
- `lib/store-brand-filter.ts`: `StoreTypeFilter`, options, parser,
  `resolveStoreTypeFilter` (ignored unless brand is ALFAMART),
  `getReportBrandWhere(brand, storeType?)`.
- `app/dashboard/reports/actions.ts`: `getAdminReports` accepts `cost` and
  `storeType`.
- `app/admin/export/queries.ts`, `app/api/admin/export/route.ts`: validate and
  apply `cost` and `storeType` in `buildReportWhere` (reports + signage).
- `app/dashboard/reports/page.tsx`, `_components/admin-reports-content.tsx`,
  `_components/admin-reports-table.tsx`, `_components/export-reports-dialog.tsx`:
  UI, URL sync and initial state.

## Decisions

- Tipe Toko is a dependent filter: it appears only after Brand = Alfamart is
  chosen, and is dropped automatically when the brand chip is removed or
  changed (`dropOrphanStoreTypeFilter`); the export dialog resets it the same
  way. The server also ignores `storeType` for non-Alfamart brands, so a
  hand-edited URL cannot produce a contradictory filter.
- "Belum diketahui" (UNKNOWN) is offered so Reguler + Franchise + Belum
  diketahui always add up to the Alfamart total.

## Verification

- `npx tsc --noEmit` (8 GB heap): no errors.
- `eslint` on changed files: only pre-existing issues.
- Browser check not done: the local dev server crashed twice with an
  out-of-memory error on this machine before the page could load.

## Remaining Work and Risks

- Verify in the browser with BMC/BNM accounts once the dev server can run.
- Reports without `storeCode` are excluded whenever a brand / tipe toko
  filter is active (existing brand behaviour).
