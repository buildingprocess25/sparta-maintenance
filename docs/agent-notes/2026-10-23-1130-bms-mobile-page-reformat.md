# Reformat BmsMobilePage

## Scope

Formatting-only change to `components/bms-mobile/bms-mobile-page.tsx`
(2-space indent, collapsed props and JSX lines). No behavior change.

## Context and Sources

- `components/bms-mobile/bms-mobile-page.tsx`

## Changed Files

- `components/bms-mobile/bms-mobile-page.tsx`: reformatted; adds a path comment `// pages\bms\bms-page.tsx`.

## Decisions

Committed as staged by the author without altering content.

## Verification

Diff reviewed: props, JSX tree and classNames are unchanged.

## Remaining Work and Risks

The path comment looks like a leftover and may be removed. The file now uses
2-space indent while most of the repo uses 4.
