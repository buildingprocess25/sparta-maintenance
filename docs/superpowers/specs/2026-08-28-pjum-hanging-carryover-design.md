# PJUM Hanging Carryover Design

## Goal

Prevent omitted completed reports from being hidden by a full BMS balance
reset. An omitted report burdens exactly the next BMS balance period and can
be included in exactly the next PJUM. After that PJUM is approved, an omitted
carryover expires permanently.

## Final Business Rules

- Regional approval and report unlock requests are removed from scope.
- A report becomes hanging when BNM approves a PJUM for its source period and
  the completed, PJUM-required report was not included.
- The hanging report is attached to the newly created balance period, so its
  `totalReal` immediately reduces that period's Rp1,000,000 balance.
- Negative available balances are valid.
- A hanging report is directly eligible in the next PJUM even though its
  `finishedAt` is outside the new date range. Old date ranges stay blocked.
- At the next BNM approval, an included hanging report is settled through the
  existing `pjumExportedAt` marker. An omitted hanging report gets
  `pjumExpiredAt` and can never enter another PJUM.
- Newly omitted reports from the period being closed become the next period's
  hanging reports.

## Data Model

Keep the lifecycle on `Report`; do not add a separate carryover table.

- `pjumHangingAt DateTime?`: first BNM approval that carried the report.
- `pjumExpiredAt DateTime?`: next BNM approval that permanently removed its
  PJUM eligibility.
- `balancePeriodId`: points to the period currently bearing the cost. When a
  report first becomes hanging, it moves to the new active period.
- `pjumExportedAt`: remains the source of truth that a report entered a PJUM.

An active hanging report satisfies:

```text
pjumHangingAt != null
pjumExpiredAt == null
pjumExportedAt == null
balancePeriodId == active balance period
```

## Approval Transition

BNM approval performs one atomic balance transition:

1. Find active hanging reports in the closing period that are absent from the
   approved PJUM and mark them expired.
2. Find completed, PJUM-required reports in the approved date range that are
   absent from the approved PJUM and have never been hanging.
3. Close the locked period and create the new Rp1,000,000 period.
4. Move the newly omitted reports to the new period and set
   `pjumHangingAt`.

Reports completed after the approved PJUM's `toDate` are not classified as
hanging by that approval.

## PJUM Candidate Rules

Candidate search returns the union of:

- normal reports in the selected date range; and
- active hanging reports attached to the BMS active period.

Expired reports are always rejected server-side. No date-range reopening or
unlock approval is required.

## User Communication

- BMS balance surfaces base balance, hanging deduction, current-period usage,
  and available balance separately, with a list of hanging reports.
- BMC sees active hanging reports in PJUM candidates and receives a clear
  one-period deadline message.
- BNM approval requires explicit confirmation when active hanging reports are
  omitted, because those reports will expire permanently.

## Audit and Safety

The original report remains `COMPLETED`. Hanging and expiry timestamps remain
on the report for audit. Approval must remain idempotent and must not carry a
report more than once.
