# Export PJUM Filter

## Scope

Adding a Status PJUM filter to the export reports dialog. It is disabled unless the report status "Selesai" is selected.

## Context and Sources

Requested by user to avoid ambiguity when filtering "Belum PJUM".

## Changed Files

- `app/admin/export/queries.ts`: Add `pjumStatus` to `ExportFilter` and handle it in `buildReportWhere`.
- `app/dashboard/reports/_components/export-reports-dialog.tsx`: Add the "Status PJUM" dropdown and logic.

## Decisions

- **Conditional Enabled**: The UI shows the Status PJUM select but disabled when status is not "COMPLETED". This balances discoverability and clear UX.
- **Auto-reset**: When main status changes to non-COMPLETED, pjumStatus resets to "ALL".

## Verification

Will verify through the UI after implementation.

## Remaining Work and Risks

None
