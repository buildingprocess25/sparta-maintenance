# Signage checklist card UI polish

## Scope

Visual fixes on the signage checklist card (I11–I13) after user review on a
375px viewport. No behavior or data changes.

## Context and Sources

- User feedback: "ACP/Alucopan" overflowed its option box, the four condition
  options blended together, and the fixed "Ditangani Rekanan" box looked like
  an ambiguous button.
- `app/reports/(bms)/create/components/signage-checklist-item.tsx`

## Changed Files

- `app/reports/(bms)/create/components/signage-checklist-item.tsx`: smaller
  text for 3-option material rows plus a line-break opportunity after "/";
  condition options rendered as separate bordered tiles; handler shown as a
  locked BMS | Rekanan segmented control (Rekanan selected with a check, BMS
  with a lock) with a helper line, and a toast explaining the lock on tap.

## Decisions

- Mirror the regular item's BMS/Rekanan control so the user immediately reads
  "Rekanan is selected", instead of a plain text box.
- Use a deduplicated `toast.info` (id per item) so repeated taps don't stack.

## Verification

- `npx tsc --noEmit`: no errors outside generated `.next` types.
- `npx eslint app/reports/(bms)/create/components/signage-checklist-item.tsx`: clean.
- Browser check on 375px is done by the user on their local dev server.

## Remaining Work and Risks

None.
