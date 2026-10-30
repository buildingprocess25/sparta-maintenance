# Signage material picker layout

## Scope

Reworks the material picker of signage items I11–I13 in the BMS checklist so "Tidak Ada" no longer sits in the material grid. No data, validation, or export changes.

## Context and Sources

- User screenshot: List Plank wrapped "Tidak Ada" to a second row, and signage options used a smaller font than older items.
- `docs/agent-notes/2026-10-30-1406-signage-not-available.md`

## Changed Files

- `app/reports/(bms)/create/components/signage-checklist-item.tsx`: material grid holds only real materials (2 or 3 columns, `text-sm` like other items; the `text-xs` downsizing is gone); "Tidak ada di toko" is a separate full-width outline button below the grid for items with `allowNotAvailable`; when chosen, the material and condition sections hide, the card gets a muted background, and the button becomes "Tidak ada di toko · Batalkan", which clears the material.

## Decisions

- Material stays first (user picked option A over asking "Ada/Tidak Ada" first) to avoid an extra tap for stores that have the signage.
- Stored value is still `signageMaterial = "TIDAK_ADA"` through the existing `applySignageSelection`; clearing passes `""`.
- Card dimming changed from `opacity-75` to a muted background so the cancel button does not look disabled.

## Verification

- `signage-checklist.spec.ts`, `signage.spec.ts` → pass.
- `npx tsc --noEmit` → no errors outside `.next/`; `npx eslint` on the file → clean.
- Not checked in the browser.

## Remaining Work and Risks

Visual check on a phone-width screen, especially "ACP/Alucopan" in the 3-column List Plank row.
