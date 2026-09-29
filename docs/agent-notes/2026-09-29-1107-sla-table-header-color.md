# Update SLA Table Header Color

## Scope

Changed the header background color of the SLA table from orange to blue to match the maintenance theme.

## Context and Sources

User requested the color change because the previous orange color didn't fit the blue maintenance theme.

## Changed Files

- `app/dashboard/branches/_components/admin-sla-table.tsx`: Changed `<TableHeader className="bg-orange-100/50">` to `<TableHeader className="bg-blue-100/50">`.

## Decisions

- Used `bg-blue-100/50` to maintain the same lightness and opacity as the previous `bg-orange-100/50` class, keeping the text legible.

## Verification

Confirmed the UI code references the new blue background class.

## Remaining Work and Risks

None.
