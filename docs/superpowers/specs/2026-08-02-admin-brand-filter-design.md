# Admin Brand Filter Design

## Purpose

Let ADMIN view Alfamart and Lawson data separately without changing existing
store, report, or preventive data. The scope is the Admin dashboard, the
Maintenance Report list and export, and Preventive dashboard and export.

## Brand Contract

The existing `Store.brand` field is the source of truth.

| Filter value | Store condition | Label |
| --- | --- | --- |
| `all` | no brand predicate | Semua |
| `alfamart` | `brand` is null, empty, or not `LAWSON` | Alfamart |
| `lawson` | normalized `brand` is `LAWSON` | Lawson |

The implementation uses one shared normalizer and predicate builder. This
keeps historical stores with an empty `brand` visible as Alfamart and avoids
duplicating the null-or-empty rule in every query.

## Scope and Access

Only ADMIN receives brand controls in this iteration. Existing BMC and BNM
scopes, screens, exports, and authorization remain unchanged.

## Dashboard

The Admin dashboard receives one global Brand select in its header. The chosen
value is retained as the `brand` URL search parameter alongside `period`.
Every command-center query uses the same brand predicate.

When `all` is selected, each KPI shows its current global value plus compact
Alfamart and Lawson breakdowns. Count KPIs show counts, monetary KPIs show
currency amounts, and completion rates show one rate per brand. Selecting a
brand makes all dashboard values and cards represent only that brand.

The filter applies to the status distribution, realisasi, branch performance,
and stuck-report cards as well as the KPI cards and trend data.

PJUM documents are associated through their report numbers. A PJUM is included
in a brand breakdown when it contains at least one report for that brand. A
mixed-brand PJUM can therefore appear in both brand breakdowns, while the
global `all` total remains unique.

## Maintenance Report List and Export

The ADMIN report table adds Brand to the existing filter controls. Brand is
sent with every initial and cursor-paginated request, so search and other
filters remain server-side.

The report-export dialog adds the same Brand select and forwards it to the
existing export route. Export queries derive a report's brand from its linked
store using the shared brand contract.

## Preventive Dashboard and Export

The ADMIN Preventive controls add Brand beside the existing branch, quarter,
and year controls. Brand filters stores before preventive completion, matrix,
branch summary, search, and cursor pagination are calculated. All tabs and KPI
values therefore use the same store population.

The Preventive export dialog forwards the selected Brand to the existing export
route, which filters its store set before producing the spreadsheet.

## Data and Performance

No schema or data migration is required: `Store.brand` already exists. Do not
add an index pre-emptively; assess query performance after the filter is in use
and add one only with measured evidence.

Reports without a resolvable store are excluded from a specific brand filter;
they remain in the `all` view. This prevents an unknown report from being
incorrectly attributed to Alfamart.

## Verification

- Unit-test the shared normalizer and brand predicates, including null, empty,
  mixed-case Lawson, and unknown values.
- Add focused action/export assertions that a selected brand reaches each
  server query.
- Verify Dashboard URL persistence, report pagination, preventive tabs, and
  both XLSX exports manually as ADMIN.
- Confirm BMC and BNM render their existing experience without a new control.
