# Store ownership and coordinates design

## Scope

Recorded the approved design for enriching `Store` records with ownership type
and coordinates from the company Google Sheet. No application code, Prisma
schema, migration, or database data was changed.

## Context and Sources

- User clarified that the company store master sheet has `F/R` where `R` means
  regular and `F` means franchise.
- User also requested syncing `Titik Koordinat`.
- `prisma/schema.prisma` currently has `Store.brand` but no ownership or
  coordinate fields.
- `lib/jobs/sync-stores.ts` shows the existing Google Sheets integration style.
- `docs/project/06-database.md` documents Prisma migration rules and says not
  to use `db push` for shared or production database changes.

## Changed Files

- `docs/superpowers/specs/2026-09-04-store-ownership-coordinates-design.md`:
  design for schema, migration workflow, sheet sync, parsing, matching, audit,
  and verification.
- `docs/agent-notes/2026-09-04-1630-store-ownership-coordinates-design.md`:
  this task note.

## Decisions

- Add an explicit ownership enum with `REGULAR`, `FRANCHISE`, and `UNKNOWN`.
- Use `UNKNOWN` for stores not matched in the company sheet so the system does
  not silently classify unmatched stores as regular.
- Store coordinates as nullable `latitude` and `longitude` decimal columns.
- Match sheet rows to database stores by normalized store code only.
- Keep brand and ownership separate: Lawson remains `Store.brand`; regular and
  franchise belong to the new ownership field.
- Generate schema changes with Prisma migrations, never `db push`.

## Verification

- Read relevant project database docs and current schema.
- Read the existing Google Sheets store sync job for integration pattern.
- Wrote a design spec and checked it for placeholders, contradictions, scope,
  and ambiguous requirements.

## Remaining Work and Risks

- Implementation remains pending after user review of the spec.
- A real sync run will require authorized company Google credentials and a
  configured spreadsheet ID/range.
- The mismatch count between database stores and sheet rows must be audited
  during implementation before any UI relies on ownership completeness.

