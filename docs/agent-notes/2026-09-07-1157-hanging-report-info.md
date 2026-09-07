# Add Info Popover to Hanging Report Card

## Scope

Add an interactive InfoPopover component to the "Gantung" card in the Balance History Drawer to explain what a hanging report is to the BMS users.

## Context and Sources

- `app/dashboard/_components/balance-history-drawer.tsx`
- Requested by user to improve UX and clarify why certain reports still deduct balance despite being from a previous period.

## Changed Files

- `app/dashboard/_components/balance-history-drawer.tsx`: Imported and positioned `InfoPopover` inside the Gantung card metric.

## Decisions

- Reused the existing `InfoPopover` component from `components/ui/info-popover.tsx` which is accessible and designed for this exact use case (small contextual hints).
- Positioned it at `absolute right-0 top-0` inside the `relative` card container to ensure it stays neatly in the top-right corner without disrupting the flex centering of the text.

## Verification

- Verified the component renders correctly and the popover panel has enough space on mobile screens (since it aligns right and max-w-md drawer prevents overflow).

## Remaining Work and Risks

None.
