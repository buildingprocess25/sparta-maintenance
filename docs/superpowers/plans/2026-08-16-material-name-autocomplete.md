# Material Name Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-form BMS material-name input with a typo-tolerant autocomplete that recommends canonical names while still allowing arbitrary text.

**Architecture:** Keep `data/masterdata-material.txt` as the deployment-versioned source of truth. Server pages read and deduplicate the file, pass the small list through the existing Server Component boundary, and a reusable shadcn Combobox performs bounded fuzzy matching in the browser without an API call or database change.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui Combobox, Base UI, Node filesystem APIs, Node assert tests executed with `tsx`.

## Global Constraints

- Do not change the Prisma schema or add a migration.
- Preserve free-text entry when no master-data option matches.
- `data/masterdata-material.txt` remains the canonical source and changes take effect after deployment.
- Search runs in the browser over the deduplicated list; do not add a search endpoint.
- Typo input such as `nordrof` must recommend `No Drop`.
- Limit rendered recommendations to eight items and preserve keyboard/touch selection.
- Apply the same master list to create, edit, and revision report flows.
- Preserve `data-tour="bms-estimation-name"` and the existing estimation-dialog dismissal guards.

---

### Task 1: Master-data parsing and fuzzy ranking

**Files:**
- Create: `lib/material-master.ts`
- Create: `lib/material-master.server.ts`
- Create: `lib/material-master.spec.ts`
- Track: `data/masterdata-material.txt`

**Interfaces:**
- Produces: `parseMaterialNames(source: string): string[]`.
- Produces: `searchMaterialNames(names: readonly string[], query: string, limit?: number): string[]`.
- Produces: `loadMaterialNames(): Promise<string[]>`, server-only.

- [ ] **Step 1: Write failing pure-behavior tests**

Create `lib/material-master.spec.ts` with Node assertions covering whitespace removal, case-insensitive duplicate removal, first-spelling preservation, empty-query behavior, direct substring ranking, the `nordrof` → `No Drop` typo case, no unrelated fuzzy matches for short queries, and the eight-result limit.

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseMaterialNames, searchMaterialNames } from "./material-master";

test("parseMaterialNames trims and deduplicates names", () => {
  assert.deepEqual(parseMaterialNames(" No Drop\n\nNO DROP\n Semen "), [
    "No Drop",
    "Semen",
  ]);
});

test("searchMaterialNames recommends No Drop for nordrof", () => {
  assert.equal(
    searchMaterialNames(["Cat Tembok", "No Drop", "Pipa PVC"], "nordrof")[0],
    "No Drop",
  );
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node_modules/.bin/tsx.cmd --test lib/material-master.spec.ts`

Expected: FAIL because `lib/material-master.ts` does not exist.

- [ ] **Step 3: Implement minimal parser and matcher**

Create `lib/material-master.ts` with Unicode-aware normalization, compact-string Levenshtein distance, deterministic ranking (exact → prefix → substring → fuzzy), fuzzy matching only for normalized queries of at least three characters, and a default limit of eight.

Create `lib/material-master.server.ts`:

```ts
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseMaterialNames } from "@/lib/material-master";

export async function loadMaterialNames(): Promise<string[]> {
  const source = await readFile(
    path.join(process.cwd(), "data", "masterdata-material.txt"),
    "utf8",
  );
  return parseMaterialNames(source);
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node_modules/.bin/tsx.cmd --test lib/material-master.spec.ts`

Expected: all parser and matcher tests pass.

---

### Task 2: Reusable free-text material Combobox

**Files:**
- Create via official registry: `components/ui/combobox.tsx`
- Modify via registry dependency resolution if needed: `components/ui/input-group.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `components/material-name-combobox.tsx`
- Create: `components/material-name-combobox.spec.ts`

**Interfaces:**
- Consumes: `searchMaterialNames(names, query, 8)` from Task 1.
- Produces: `MaterialNameCombobox({ id, value, options, onValueChange, ...inputProps })` as a controlled reusable field.

- [ ] **Step 1: Add a failing source-contract test**

Create a small Node test that asserts the reusable component imports `searchMaterialNames`, renders the shadcn `ComboboxInput`, disables the Combobox's second-pass filter, exposes the supplied `id`, and keeps the input controlled through `onInputValueChange`.

- [ ] **Step 2: Run the component contract and confirm RED**

Run: `node_modules/.bin/tsx.cmd --test components/material-name-combobox.spec.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Install and review the official shadcn Combobox**

Run: `node_modules/.bin/shadcn.cmd add '@shadcn/combobox'`

Review every generated file. Confirm imports use `@/`, icons come from `lucide-react`, the component is Radix-style compatible with this project, and no unrelated files are overwritten. Do not use `--overwrite`.

- [ ] **Step 4: Implement the controlled autocomplete**

Create `components/material-name-combobox.tsx`. Keep the typed value as `inputValue`, compute at most eight suggestions with `useMemo`, pass those suggestions as `items`, disable built-in filtering so typo matches remain visible, and propagate both typing and option selection through `onValueChange`. Show this empty state when appropriate:

```tsx
<ComboboxEmpty>
  Nama belum ada di master. Teks tetap dapat digunakan.
</ComboboxEmpty>
```

Use `placeholder="Ketik nama material"`, `autoHighlight`, full-width input/content, and no custom overlay z-index. The user must be able to keep the typed value without selecting an option.

- [ ] **Step 5: Run focused tests and lint**

Run:

```powershell
node_modules/.bin/tsx.cmd --test lib/material-master.spec.ts components/material-name-combobox.spec.ts
node_modules/.bin/eslint.cmd components/material-name-combobox.tsx components/ui/combobox.tsx lib/material-master.ts lib/material-master.server.ts
```

Expected: both test files pass and ESLint exits 0.

---

### Task 3: Wire create, edit, and revision report flows

**Files:**
- Modify: `app/reports/(bms)/create/page.tsx`
- Modify: `app/reports/(bms)/edit/[id]/page.tsx`
- Modify: `app/reports/(bms)/revisi/[reportNumber]/page.tsx`
- Modify: `app/reports/(bms)/create/components/types.ts`
- Modify: `app/reports/(bms)/create/create-form.tsx`
- Modify: `app/reports/(bms)/create/components/bms-estimation-step.tsx`
- Create: `app/reports/(bms)/create/components/material-autocomplete-wiring.spec.ts`

**Interfaces:**
- Consumes: `loadMaterialNames()` and `MaterialNameCombobox` from Tasks 1–2.
- Adds: `materialNames: string[]` to `CreateReportFormProps` and `BmsEstimationStepProps`.

- [ ] **Step 1: Write a failing wiring contract**

Test the relevant source files for these required connections: all three server pages call `loadMaterialNames`; all three pass `materialNames` to `CreateReportForm`; `CreateReportForm` passes it to `BmsEstimationStep`; the estimation step renders `MaterialNameCombobox`; and `data-tour="bms-estimation-name"` remains present.

- [ ] **Step 2: Run the wiring test and confirm RED**

Run: `node_modules/.bin/tsx.cmd --test 'app/reports/(bms)/create/components/material-autocomplete-wiring.spec.ts'`

Expected: FAIL because no page loads or passes `materialNames` yet.

- [ ] **Step 3: Add the server-to-client data flow**

In each server page, load stores and material names concurrently where possible:

```ts
const [stores, materialNames] = await Promise.all([
  getStoresByBranch(user.branchNames[0] || ""),
  loadMaterialNames(),
]);
```

Pass `materialNames` through `CreateReportFormProps`, `CreateReportForm`, and `BmsEstimationStepProps`.

- [ ] **Step 4: Replace only the material-name Input**

In `bms-estimation-step.tsx`, replace the current `Input` for `estimateDraft.itemName` with `MaterialNameCombobox`. Preserve the existing label/id, controlled draft update, `data-tour` attribute, save validation, free-text trimming, and every other estimation field.

- [ ] **Step 5: Run focused regressions and type checking**

Run:

```powershell
node_modules/.bin/tsx.cmd --test lib/material-master.spec.ts components/material-name-combobox.spec.ts 'app/reports/(bms)/create/components/material-autocomplete-wiring.spec.ts' 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts' 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'
node_modules/.bin/tsc.cmd --noEmit
node_modules/.bin/eslint.cmd 'app/reports/(bms)/create/page.tsx' 'app/reports/(bms)/edit/[id]/page.tsx' 'app/reports/(bms)/revisi/[reportNumber]/page.tsx' 'app/reports/(bms)/create/create-form.tsx' 'app/reports/(bms)/create/components/bms-estimation-step.tsx' 'app/reports/(bms)/create/components/types.ts' components/material-name-combobox.tsx components/ui/combobox.tsx lib/material-master.ts lib/material-master.server.ts
```

Expected: all focused tests pass; TypeScript and ESLint exit 0.

---

### Task 4: Documentation, task note, and final verification

**Files:**
- Modify: `AI_CONTEXT.md`
- Create: `docs/agent-notes/YYYY-MM-DD-HHMM-material-name-autocomplete.md`

**Interfaces:** None.

- [ ] **Step 1: Update canonical documentation**

Add a concise BMS report note to `AI_CONTEXT.md`: the material master is `data/masterdata-material.txt`, it is loaded server-side and searched client-side, free text remains valid, updates require deployment, and no database table backs it.

- [ ] **Step 2: Create the required dated agent note**

Use Asia/Jakarta time and `docs/agent-notes/TEMPLATE.md`. Record scope, reviewed sources, exact changed files, the browser-search decision, deduplication behavior, verification evidence, and remaining manual mobile validation risk. Do not include raw master-data contents.

- [ ] **Step 3: Run final verification**

Run:

```powershell
node_modules/.bin/tsx.cmd --test lib/material-master.spec.ts components/material-name-combobox.spec.ts 'app/reports/(bms)/create/components/material-autocomplete-wiring.spec.ts' 'app/reports/(bms)/create/components/bms-input-tour-targets.spec.ts' 'app/reports/(bms)/create/components/bms-report-tour-runtime.spec.ts'
node_modules/.bin/tsc.cmd --noEmit
node_modules/.bin/eslint.cmd 'app/reports/(bms)/create/page.tsx' 'app/reports/(bms)/edit/[id]/page.tsx' 'app/reports/(bms)/revisi/[reportNumber]/page.tsx' 'app/reports/(bms)/create/create-form.tsx' 'app/reports/(bms)/create/components/bms-estimation-step.tsx' 'app/reports/(bms)/create/components/types.ts' components/material-name-combobox.tsx components/ui/combobox.tsx lib/material-master.ts lib/material-master.server.ts
npm run test:agent-note
git diff --check
```

Expected: tests pass with zero failures; type check, lint, agent-note tests, and diff check exit 0.

- [ ] **Step 4: Review the final diff and commit once**

Because the repository hook requires a newly staged dated task note for every substantive commit, stage the complete implementation and its task note together, then commit using a concise Conventional Commit message. Do not use `--no-verify`.
