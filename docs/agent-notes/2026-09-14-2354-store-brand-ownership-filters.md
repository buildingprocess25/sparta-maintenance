# Store Brand Ownership Filters

## Scope

Add Brand and Tipe Toko columns plus server-side Brand and Tipe Toko filters to `/dashboard/stores`. Outside scope: database migration, export behavior changes, and changes to store import parsing.

## Context and Sources

- `AI_RULES.md`
- `docs/project/05-routes-and-ui.md`
- `docs/project/06-database.md`
- `app/dashboard/stores/actions.ts`
- `app/dashboard/stores/page.tsx`
- `app/dashboard/stores/_components/admin-stores-table.tsx`
- `prisma/schema.prisma`

## Changed Files

- `app/dashboard/stores/actions.ts`: added `brand` and `ownershipType` filters and selected `ownershipType` for the stores table.
- `app/dashboard/stores/page.tsx`: read `brand` and `type` search params for initial server-side data.
- `app/dashboard/stores/_components/admin-stores-table.tsx`: added Brand and Tipe Toko columns plus dropdown filters.
- `app/dashboard/stores/actions.test.ts`: added source-level checks for server-side store filters.
- `app/dashboard/stores/admin-stores-table.test.ts`: added source-level checks for stores table columns, labels, URL params, and filters.
- `docs/project/05-routes-and-ui.md`: documented stores table columns and filters.

## Decisions

- No database migration is needed because `Store.brand` and `Store.ownershipType` already exist.
- Brand filtering uses direct database brand values from `getAllBrands()` and excludes empty options from the dropdown.
- Empty brand values render as `-`.
- Tipe toko filtering supports `REGULAR`, `FRANCHISE`, and `UNKNOWN`; `UNKNOWN` displays as `-`.

## Verification

- Focused source tests passed:
  - `node_modules\.bin\tsx.cmd "app/dashboard/stores/actions.test.ts"`
  - `node_modules\.bin\tsx.cmd "app/dashboard/stores/admin-stores-table.test.ts"`
- TypeScript passed:
  - `node_modules\.bin\tsc.cmd --noEmit --incremental false`
- Production build passed with the `build:memory` equivalent command because the local `npm` wrapper is missing `npm-cli.js`:
  - `node_modules\.bin\next.cmd build` with `NODE_OPTIONS=--max-old-space-size=4096`

## Remaining Work and Risks

- `npm run build:memory` could not start because the machine's global npm wrapper cannot find `C:\Users\Rendi Elang\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`. The equivalent local Next build passed after network access was allowed for Google Fonts.
