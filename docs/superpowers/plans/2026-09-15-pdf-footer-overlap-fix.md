# PDF Footer Overlap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the PDF footer so it never overlaps with page content by increasing `paddingBottom` and aligning footer text vertically centered with the QR code.

**Architecture:** Three PDF generators share identical footer style blocks (no shared util yet). Each file's `footer`, `footerLeft`, and page `paddingBottom` will be updated independently to keep the files self-contained and avoid introducing a shared util risk mid-fix.

**Tech Stack:** `@react-pdf/renderer`, TypeScript, React.createElement (no JSX in PDF generators).

## Global Constraints

- Do NOT introduce a shared footer utility file — each PDF generator is self-contained by design.
- Target files: `lib/pdf/generate-report-pdf.ts`, `lib/pdf/generate-revision-pdf.ts`
- The `docPhotoPageStyles` block inside `generate-report-pdf.ts` is a separate stylesheet for the checklist photo pages and must also be updated.
- All `paddingBottom` values must satisfy the existing contract spec test in `lib/pdf/pdf-validator-footer-reserve.spec.ts` (accepts `90–199`).
- Do NOT modify test files unless the test needs updating to match new values.
- Do NOT run `npm run build` — use `npx tsc --noEmit` with `NODE_OPTIONS=--max-old-space-size=4096` for type checking.

---

## Footer Height Calculation (Reference)

Current footer content height breakdown (absolute positioning, `bottom: 20`):
```
Label "Validasi dokumen SPARTA"  ≈  8pt  (fontSize 5.5 + lineHeight)
QR Image                          = 56pt
Code "PJUM-xxxxx"                 ≈  8pt
paddingTop of footer              =  6pt
Gap between elements              ≈  4pt
                                  ------
Total footer height               ≈ 82pt
bottom offset                     = 20pt
                                  ------
Footer top edge from bottom       ≈ 102pt  (82 + 20)
```

`paddingBottom: 92` is **not enough** — content can reach up to `102pt` from bottom.
Fix: raise `paddingBottom` to **112** to give a 10pt safety margin.

---

## Task 1: Fix `generate-report-pdf.ts` — main report stylesheet (`styles`)

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts:82-306`

**Interfaces:**
- Produces: no API change — only visual layout change in rendered PDF

### Changes to make (lines ~82–306 in `styles = StyleSheet.create({...})`):

1. `page.paddingBottom`: `92` → `112`
2. `footer.alignItems`: `"flex-start"` → `"center"`

These are the only two properties that need changing in this stylesheet.

- [ ] **Step 1: Update `page.paddingBottom` in main `styles` block**

In `lib/pdf/generate-report-pdf.ts`, find the `styles = StyleSheet.create` block (line ~82). Change:
```typescript
// BEFORE
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 92,
    paddingHorizontal: 36,
    color: "#111827",
},
```
To:
```typescript
// AFTER
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 112,
    paddingHorizontal: 36,
    color: "#111827",
},
```

- [ ] **Step 2: Update `footer.alignItems` in main `styles` block**

In the same `styles` block (line ~264–273), change:
```typescript
// BEFORE
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
},
```
To:
```typescript
// AFTER
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
},
```

- [ ] **Step 3: Verify the contract spec still passes**

Run:
```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
node -e "require('./node_modules/tsx/dist/cjs/api/index.cjs').register(); require('./lib/pdf/pdf-validator-footer-reserve.spec.ts')"
```
Expected: spec passes (paddingBottom 112 matches regex `/paddingBottom:\s*9[0-9]|paddingBottom:\s*1[0-9]{2}/`).

---

## Task 2: Fix `generate-report-pdf.ts` — photo page stylesheet (`docPhotoPageStyles`)

**Files:**
- Modify: `lib/pdf/generate-report-pdf.ts:2776–2900`

**Interfaces:**
- Produces: no API change — only visual layout change in checklist photo pages of rendered PDF

- [ ] **Step 1: Update `page.paddingBottom` in `docPhotoPageStyles` block**

In `lib/pdf/generate-report-pdf.ts`, find the `docPhotoPageStyles = StyleSheet.create` block (line ~2776). Change:
```typescript
// BEFORE
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 92,
    paddingHorizontal: 36,
    color: "#111827",
},
```
To:
```typescript
// AFTER
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 112,
    paddingHorizontal: 36,
    color: "#111827",
},
```

- [ ] **Step 2: Update `footer.alignItems` in `docPhotoPageStyles` block**

In the same `docPhotoPageStyles` block (line ~2844–2852), change:
```typescript
// BEFORE
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
},
```
To:
```typescript
// AFTER
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
},
```

- [ ] **Step 3: Commit tasks 1 and 2 together**

```powershell
git add "lib/pdf/generate-report-pdf.ts"
git commit -m "fix(pdf): increase paddingBottom and center footer items in report PDF"
```

---

## Task 3: Fix `generate-revision-pdf.ts` — revision report stylesheet (`s`)

**Files:**
- Modify: `lib/pdf/generate-revision-pdf.ts:73–308`

**Interfaces:**
- Produces: no API change — only visual layout change in rendered revision PDF

- [ ] **Step 1: Update `page.paddingBottom` in `s` stylesheet**

In `lib/pdf/generate-revision-pdf.ts`, find `const s = StyleSheet.create({` (line ~73). Change:
```typescript
// BEFORE
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 92,
    paddingHorizontal: 36,
    color: "#111827",
},
```
To:
```typescript
// AFTER
page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 32,
    paddingBottom: 112,
    paddingHorizontal: 36,
    color: "#111827",
},
```

- [ ] **Step 2: Update `footer.alignItems` in `s` stylesheet**

In the same `s` block (line ~265–273), change:
```typescript
// BEFORE
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
},
```
To:
```typescript
// AFTER
footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
},
```

- [ ] **Step 3: Run TypeScript check**

```powershell
$env:NODE_OPTIONS='--max-old-space-size=4096'
npx tsc --noEmit
```
Expected: exit code 0, no type errors.

- [ ] **Step 4: Commit**

```powershell
git add "lib/pdf/generate-revision-pdf.ts"
git commit -m "fix(pdf): increase paddingBottom and center footer items in revision PDF"
```

---

## Task 4: Write Agent Task Note

**Files:**
- Create: `docs/agent-notes/2026-09-15-HHMM-pdf-footer-overlap-fix.md`

- [ ] **Step 1: Write task note**

Create `docs/agent-notes/2026-09-15-HHMM-pdf-footer-overlap-fix.md` with actual timestamp:

```markdown
# PDF Footer Overlap Fix

## Scope

Fixed overlapping footer on dense PDF pages. Changed `paddingBottom` from 92 to 112 and
`footer.alignItems` from `flex-start` to `center` in all three affected stylesheets
(`styles`, `docPhotoPageStyles` in generate-report-pdf.ts, and `s` in generate-revision-pdf.ts).

## Context and Sources

- User reported footer text and separator line overlapping page content on dense pages.
- Root cause: footer height ~82pt + bottom: 20 = 102pt from bottom, exceeding paddingBottom: 92.
- Fix: raise paddingBottom to 112 (10pt safety margin), align footer items center for visual polish.

## Changed Files

- `lib/pdf/generate-report-pdf.ts`: paddingBottom 92→112 in `styles.page` and
  `docPhotoPageStyles.page`; alignItems flex-start→center in `styles.footer` and
  `docPhotoPageStyles.footer`.
- `lib/pdf/generate-revision-pdf.ts`: paddingBottom 92→112 in `s.page`;
  alignItems flex-start→center in `s.footer`.

## Decisions

- Did not refactor into shared footer util to avoid risk mid-fix.
- paddingBottom 112 satisfies existing contract test regex `9[0-9]|1[0-9]{2}`.

## Verification

- Contract spec `pdf-validator-footer-reserve.spec.ts` passes.
- TypeScript: `npx tsc --noEmit` exits 0.

## Remaining Work and Risks

None.
```

- [ ] **Step 2: Commit task note**

```powershell
git add "docs/agent-notes/"
git commit -m "docs: add agent note for PDF footer overlap fix"
```
