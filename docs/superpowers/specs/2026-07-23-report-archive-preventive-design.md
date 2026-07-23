# Report Archive and Preventive Retention Design

**Date:** 2026-07-23
**Status:** Approved design, pending implementation plan

## Problem

Admin sometimes needs to remove a garbage operational report. The current
delete action permanently removes the `Report`, its checklist JSON, approval
logs, activity logs, and PJUM membership. Because Preventive completion is
derived from report data, deleting a report also removes the store's
Preventive record even when BMS completed the Preventive checklist.

The application still needs a true database delete for exceptional cases.
Archive and permanent delete must therefore be separate Admin actions.

## Goals

- Preserve a valid Preventive visit when its operational report is garbage.
- Keep the original checklist, photos, BMS/store identity, and audit history.
- Keep permanent database deletion available to Admin.
- Make archived reports read-only and remove them from operational workflows.
- Use one Preventive-completion rule across the BMS badge, cooldown,
  dashboard, history, and XLSX export.
- Prevent an approved PJUM from being changed implicitly.

## Non-goals

- Restoring an archived report.
- Creating a separate archive-management page.
- Copying Preventive data into a new table.
- Deleting Google Drive photos, PDFs, or shared folders during permanent
  deletion.
- Backfilling or modifying existing reports during migration.

## Definitions

### Complete Preventive evidence

A report has complete Preventive evidence when:

1. Its status is not `DRAFT`.
2. Every Preventive item defined by `checklistCategories` is present in the
   report.
3. Every required item has a `preventiveCondition` of `OK`, `NOT_OK`, or
   `TIDAK_ADA`.

The implementation must use the checklist catalog as the canonical item list.
It must not infer completeness from a single item or only from an `I` prefix.

### Store is already Preventive

A store is already Preventive for a quarter when at least one report in that
quarter has complete Preventive evidence. This includes normal submitted
reports and reports with status `ARCHIVED_PREVENTIVE`.

If one qualifying report is permanently deleted, the store remains already
Preventive when another qualifying report exists in the same quarter.
Quarter boundaries use the existing `Asia/Jakarta` application-time helpers
across every consumer.

## Data model

Add a terminal `ReportStatus` value:

```text
ARCHIVED_PREVENTIVE
```

Add an `ActivityAction` value:

```text
ADMIN_ARCHIVED_PREVENTIVE
```

Archiving keeps the existing `Report` row and all related evidence. The
archive activity records the Admin actor, timestamp, and the report's previous
status. No manually entered archive reason is required.

No archive table or additional copy of the checklist is created.

## Authorization

Only `ADMIN` can archive or permanently delete a report.

`BMC` and `BNM_MANAGER` can open archived report details read-only when the
report belongs to an assigned branch. `ADMIN` can open all permitted branches.
`BMS` cannot list or open archived reports, including through a direct URL.

All authorization and branch checks are enforced on the server. UI visibility
is not treated as authorization.

## Archive action

Archive is a new action, separate from permanent delete.

The server:

1. Authenticates an `ADMIN`.
2. Loads the report, checklist items, and PJUM memberships.
3. Rejects a missing or already archived report.
4. Rejects a report without complete Preventive evidence.
5. Rejects the action when any related PJUM is `APPROVED`.
6. Runs one database transaction that:
   - detaches the report from `PENDING_APPROVAL` and `REJECTED` PJUM records;
   - deletes a detached PJUM when it becomes empty;
   - clears the report's PJUM membership marker;
   - changes the report status to `ARCHIVED_PREVENTIVE`;
   - adds `ADMIN_ARCHIVED_PREVENTIVE` activity with the previous status.
7. Revalidates the reports, dashboard, PJUM, and Preventive views.

The Preventive completion date remains the report submission/creation date,
not the archive timestamp.

## Permanent delete action

Permanent delete remains available for every report, including reports with
complete Preventive evidence and archived reports.

The server:

1. Authenticates an `ADMIN`.
2. Requires a confirmation value equal to the report number.
3. Loads the report and PJUM memberships.
4. Rejects the action when any related PJUM is `APPROVED`.
5. Runs one database transaction that:
   - detaches the report from `PENDING_APPROVAL` and `REJECTED` PJUM records;
   - deletes a detached PJUM when it becomes empty;
   - deletes approval logs and activity logs;
   - deletes the `Report` row.
6. Revalidates all affected views.

Google Drive files are intentionally retained. Permanent delete means
permanent removal from the application database, not external file deletion.

## User interface

The Admin report Danger Zone shows two separate actions.

### Archive report

- Visible only when the report has complete Preventive evidence and is not
  already archived.
- Uses a confirmation dialog without an archive-reason field.
- Explains that the operational report will disappear while Preventive
  evidence remains.
- Redirects to the Preventive dashboard after success.

### Permanently delete report

- Available for normal and archived reports.
- Requires the Admin to type the exact report number.
- Shows an additional warning when complete Preventive evidence exists:
  deleting the report may remove the store's already-Preventive status.
- Does not claim that Google Drive files are deleted.

When an approved PJUM blocks either action, the UI explains that the PJUM must
be cancelled or revised first. The server remains authoritative if UI state is
stale.

## Archived report behavior

Archived reports:

- are excluded from BMS/Admin operational report lists;
- are excluded from workflow queues, approval queues, KPI totals, SLA counts,
  branch performance, materials, realisasi, PJUM candidates, and operational
  exports;
- cannot be edited, revised, approved, completed, or added to PJUM;
- remain included in Preventive status, history, dashboard summaries, and
  Preventive XLSX export;
- remain reachable from the Preventive dashboard as a read-only audit detail;
- show an `Archived Preventive` status badge;
- retain permanent delete as an Admin-only action.

There is no separate archive list or restore action in this scope.

## Preventive source of truth

Create one shared pure helper for complete Preventive evidence. Use it wherever
report JSON is already loaded.

Database queries that aggregate Preventive data must implement the same rule
using the canonical Preventive item IDs and valid condition values. The
required IDs must be supplied from the checklist catalog rather than repeated
as unrelated hardcoded lists.

The following consumers must agree:

- BMS store-selection badge;
- BMS quarterly cooldown;
- latest Preventive date;
- Admin/BMC/BNM Preventive dashboard;
- Preventive history and completion summaries;
- Preventive XLSX export;
- archive-action validation.

Operational queries must explicitly exclude `ARCHIVED_PREVENTIVE`. Preventive
queries include all non-draft reports with complete Preventive evidence,
including archived reports.

## Error handling and consistency

- Invalid role, branch, confirmation value, checklist completeness, archive
  state, and PJUM state return specific user-facing errors.
- Archive and delete database mutations are transactional.
- A failed validation performs no mutation.
- Repeated archive attempts return an already-archived error.
- Permanent deletion of one report does not mark a store pending when another
  qualifying report exists for the same quarter.
- Google Drive failures are irrelevant because neither action deletes Drive
  files.

## Migration and deployment

The Prisma migration only adds the two enum values. It performs no data update
or backfill.

PostgreSQL enum additions are additive. If application code is rolled back,
the unused enum values can remain safely in the database.

Implementation and verification happen locally. No production migration is
run manually during development. The migration is applied only through the
approved Dokploy deployment flow after the code, spec, plan, and verification
results are reviewed.

## Verification

Focused regression checks must cover:

1. Complete and incomplete Preventive detection.
2. All consumers agree on store/quarter Preventive status.
3. Only Admin can archive or permanently delete.
4. Archive preserves the report, evidence, and activity history.
5. Archived reports disappear from every operational query and export.
6. Archived reports remain in Preventive dashboard/history/XLSX.
7. `APPROVED` PJUM blocks both actions without mutation.
8. `PENDING_APPROVAL` and `REJECTED` PJUM detach correctly and empty PJUM
   records are deleted.
9. Incorrect report-number confirmation blocks permanent deletion.
10. Permanent deletion works for normal, Preventive, and archived reports.
11. BMC/BNM branch-scoped read-only access works; BMS access is rejected.

Before completion, run focused tests, ESLint, TypeScript typecheck, production
build, Prisma schema validation, and `git diff --check`.

## Acceptance criteria

- Admin can choose Archive or Permanent Delete as distinct actions.
- A garbage report with complete Preventive evidence can be removed from
  operations without losing the store's Preventive record.
- Admin can still permanently delete that report after explicit confirmation.
- Approved financial history cannot be altered implicitly.
- Every Preventive surface reports the same store/quarter state.
- Production remains unchanged until the reviewed Dokploy deployment.
