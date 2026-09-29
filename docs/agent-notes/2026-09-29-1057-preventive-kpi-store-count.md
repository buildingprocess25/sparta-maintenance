# Update Preventive KPI Widget Store Count

## Scope

Updated the Preventive KPI Widget to display the store count as `completed/total Toko` instead of just `completed Toko`.

## Context and Sources

User requested the store count to be displayed as a fraction (e.g., 265/267 Toko) in the "5 Cabang Preventif Tertinggi" list.

## Changed Files

- `app/dashboard/_components/admin/preventive-kpi-widget.tsx`: Updated `({item.completed} Toko)` to `({item.completed}/{item.total} Toko)`.

## Decisions

- Leveraged existing `item.total` property in the `PreventiveKpiListItem` type without needing to fetch additional data from the database.

## Verification

Confirmed the UI code references the correct `{item.completed}/{item.total}` syntax.

## Remaining Work and Risks

None.
