# Fix BMS Coverage Hierarchy Table HTML Hydration Error

## Scope

Fix HTML hydration error (`In HTML, <tr> cannot be a child of <div>`) in `BmsCoverageHierarchyTable` when viewing BMS coverage table.

## Context and Sources

- Error reported: `Console Error: In HTML, <tr> cannot be a child of <div>. This will cause a hydration error.`
- File affected: `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`

## Changed Files

- `app/dashboard/preventive/_components/bms-coverage-hierarchy-table.tsx`: Replaced invalid `<div key={...} className="contents">` wrappers inside `<TableBody>` with `<Fragment key={...}>`.

## Decisions

- React `<Fragment>` (or `<React.Fragment>`) provides keying without emitting wrapper DOM elements (such as `<div>`), complying with HTML `<tbody>` specs where only `<tr>` elements are allowed as direct children.

## Verification

- `npx tsc --noEmit` executed without errors in `bms-coverage-hierarchy-table.tsx`.

## Remaining Work and Risks

None
