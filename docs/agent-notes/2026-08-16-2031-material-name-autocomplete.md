# BMS material name autocomplete

## Scope

Add typo-tolerant material-name recommendations to the BMS estimation dialog
while preserving free-text input. Apply the same static master to create, edit,
and revision flows without a database schema change or search endpoint.

## Context and Sources

- `AI_RULES.md`
- `AI_CONTEXT.md`
- `PRODUCT.md`
- `DESIGN.md`
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- `app/reports/(bms)/create/page.tsx`
- `app/reports/(bms)/edit/[id]/page.tsx`
- `app/reports/(bms)/revisi/[reportNumber]/page.tsx`
- `docs/agent-notes/2026-07-28-1525-fix-bms-estimation-tour-dialog.md`
- `docs/agent-notes/2026-07-28-1546-lock-bms-estimation-dialog-during-tour.md`
- `docs/agent-notes/2026-07-28-1556-unblock-bms-tour-tooltip.md`
- Official shadcn registry entries for Combobox and Popover

## Changed Files

- `data/masterdata-material.txt`: canonical deployment-versioned material list.
- `lib/material-master.ts`: parsing, normalization, deduplication, and bounded
  fuzzy ranking.
- `lib/material-master.server.ts`: server-only master-file loader.
- `components/ui/combobox.tsx`: official shadcn Combobox component.
- `components/material-name-combobox.tsx`: reusable controlled autocomplete
  that preserves free text.
- `app/reports/(bms)/create/page.tsx`: load and pass the master list.
- `app/reports/(bms)/edit/[id]/page.tsx`: load and pass the master list.
- `app/reports/(bms)/revisi/[reportNumber]/page.tsx`: load and pass the master
  list.
- `app/reports/(bms)/create/create-form.tsx`: forward material names to the
  estimation step.
- `app/reports/(bms)/create/components/types.ts`: add the material-list prop.
- `app/reports/(bms)/create/components/bms-estimation-step.tsx`: replace only
  the material-name input with the autocomplete.
- `lib/material-master.spec.ts`,
  `components/material-name-combobox.spec.ts`, and
  `app/reports/(bms)/create/components/material-autocomplete-wiring.spec.ts`:
  cover parser, fuzzy matching, free-text control, and all route wiring.
- `package.json` and `package-lock.json`: add the official Base UI dependency
  required by the current shadcn Combobox.
- `AI_CONTEXT.md`: record the permanent master-data behavior.
- `docs/superpowers/plans/2026-08-16-material-name-autocomplete.md`: record the
  implementation plan.

## Decisions

The 622-row, approximately 11 KB source is small enough to send once and search
in the browser. Parsing removes blank lines and normalized duplicates while
preserving the first canonical spelling. Exact, prefix, and substring matches
rank before fuzzy matches; only eight suggestions render. A missing suggestion
does not invalidate the typed value. Master updates require replacing the text
file and redeploying the application.

## Verification

- TDD RED confirmed missing parser and missing component/wiring before
  implementation.
- Focused Node test suite passed 14 tests, including `nordrof` recommending
  `No Drop` and both existing BMS tour regression files.
- Focused ESLint completed without diagnostics.
- `node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`
  completed without diagnostics.

## Remaining Work and Risks

Manual validation is still recommended on a mobile viewport to confirm the
Combobox popup, keyboard, touch selection, and the guided-tour overlay interact
correctly inside the non-modal estimation dialog.
