# Task 1 Report: PJUM Store Type Grouping Helper

## What Changed

- Added `lib/pdf/pjum-store-type-breakdown.ts`.
- Added `lib/pdf/pjum-store-type-breakdown.spec.ts`.
- Added a required agent note at
  `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`.

The helper resolves PJUM rows into these ordered categories:
`Alfamart Reguler`, `Alfamart Franchise`, `Lawson`, and
`Alfamart - Tipe Toko Belum Diketahui`. It totals `totalRealisasi` per group
and sets `shouldRenderBreakdown` only when more than one category has rows.

## RED Test Evidence

The requested command was attempted first:

```powershell
node_modules\.bin\tsx.cmd "lib/pdf/pjum-store-type-breakdown.spec.ts"
```

It failed before the spec loaded because of the existing local Windows `tsx`
startup issue:

```text
SystemError [ERR_SYSTEM_ERROR]: uv_os_get_passwd returned ENOMEM
```

Using the local workaround already documented in prior notes:

```powershell
node -e "process.geteuid=()=>'codex'; require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/pjum-store-type-breakdown.spec.ts')"
```

RED failed for the expected reason before implementation:

```text
Error: Cannot find module './pjum-store-type-breakdown'
```

## GREEN Test Evidence

After implementation, the requested command was attempted again and hit the same
pre-test `tsx.cmd` environment failure:

```text
SystemError [ERR_SYSTEM_ERROR]: uv_os_get_passwd returned ENOMEM
```

The workaround command then passed:

```text
1..5
# tests 5
# pass 5
# fail 0
```

## Files Changed

- `lib/pdf/pjum-store-type-breakdown.ts`
- `lib/pdf/pjum-store-type-breakdown.spec.ts`
- `docs/agent-notes/2026-09-16-1117-pjum-store-type-grouping-helper.md`
- `.superpowers/sdd/task-1-report.md`

## Self-Review

- Scope stayed limited to the new helper, its spec, the required agent note, and
  this report.
- No renderer, package, Prisma schema, or canonical docs were modified.
- The helper is pure and generic over row shape extending the required input.
- The implementation differs slightly from the brief's pasted helper snippet:
  unrecognized brands are mapped to `ALFAMART_UNKNOWN` before ownership is
  considered. This is necessary for the provided test named
  `resolvePjumStoreTypeCategory treats missing or unrecognized store metadata as unknown Alfamart`
  to pass.

## Concerns

- The exact `tsx.cmd` command in the brief cannot execute tests in this Windows
  environment because `tsx` fails while calling `os.userInfo()` before loading
  the spec. The test itself passes through the same repo workaround used in
  earlier notes.

## Review Fix Evidence

- Updated `docs/project/04-workflows.md` with the PJUM recap PDF contract:
  single-category exports keep one recap table; mixed-category exports show the
  combined recap first, then category breakdown after signatures; categories are
  `Alfamart Reguler`, `Alfamart Franchise`, `Lawson`, and
  `Alfamart - Tipe Toko Belum Diketahui`.
- Updated `docs/project/06-database.md` with the classification source:
  `Report.storeCode` maps to `Store.code`; Lawson comes from
  `Store.brand = LAWSON`; Alfamart regular/franchise comes from
  `Store.ownershipType`; missing, `UNKNOWN`, or unrecognized metadata displays
  as `Alfamart - Tipe Toko Belum Diketahui` and is not guessed as regular.
