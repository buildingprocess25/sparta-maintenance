# Bind Toko Material Photos to Specific Stores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the UI and form state so that BMS uploads material store photos directly inside each store's data card, ensuring each photo is strictly bound to its specific store.

**Architecture:** We will remove the global "Toko material" photo upload section. Instead, the `MaterialStoreEntry` state will be updated to hold an array of `LocalPhoto`s. We will add a mini photo gallery inside the `Data toko material` repeating block. During submission, the form will upload each store's photos and map the returned URLs directly to the `photoUrls` property of the respective store. This change must be applied to both the "Start Work" flow and the "Completion Revision" flow.

**Tech Stack:** React, Next.js, IndexedDB (for autosave), Prisma

## Global Constraints

- Keep "Nota pembelian" as a global photo upload field as requested.
- Maintain existing autosave capabilities using IndexedDB.
- Do not lose backward compatibility with previously saved drafts (handle parsing gracefully).

---

### Task 1: Update Start Work Autosave Types and Logic

**Files:**
- Modify: `app/reports/[reportNumber]/start/use-start-work-autosave.ts`

**Interfaces:**
- Consumes: Existing IndexedDB photos and local storage data
- Produces: Updated `StartWorkDraftData` (version bumped) and `RestoredStartWorkDraft` with per-store photo support.

- [ ] **Step 1: Update type definitions**
Update `StartWorkMaterialStoreDraft` to include `photoIds: string[]`. Bump the draft `version` to 2.

```typescript
export type StartWorkMaterialStoreDraft = {
    id: string;
    name: string;
    city: string;
    photoIds: string[];
};

export type StartWorkDraftData = {
    version: 2;
    reportNumber: string;
    savedAt: string;
    selfiePhotoIds: string[];
    receiptPhotoIds: string[];
    materialStores: StartWorkMaterialStoreDraft[];
    skipPhotos: boolean;
};

export type RestoredStartWorkMaterialStore = StartWorkMaterialStoreDraft & {
    photos: StartWorkLocalPhoto[];
};

export type RestoredStartWorkDraft = {
    selfiePhotos: StartWorkLocalPhoto[];
    receiptPhotos: StartWorkLocalPhoto[];
    materialStores: RestoredStartWorkMaterialStore[];
    skipPhotos: boolean;
};
```

- [ ] **Step 2: Update restoreDraft logic to handle nested photos**
Modify the `restoreDraft` function to parse version 2 and recursively restore photos for each store. 

```typescript
            if (draft.version !== 2) {
                // optional: add basic migration from version 1 or just return null
                return null;
            }

            const selfiePhotos = await restorePhotos(draft.selfiePhotoIds);
            const receiptPhotos = await restorePhotos(draft.receiptPhotoIds);
            
            const materialStores: RestoredStartWorkMaterialStore[] = [];
            for (const store of draft.materialStores) {
                materialStores.push({
                    ...store,
                    photos: await restorePhotos(store.photoIds || []),
                });
            }

            return {
                selfiePhotos,
                receiptPhotos,
                materialStores,
                skipPhotos: draft.skipPhotos,
            };
```

### Task 2: Refactor Start Work Client UI and Form State

**Files:**
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx`

**Interfaces:**
- Consumes: Updated autosave logic from Task 1.

- [ ] **Step 1: Update local state types**
Change `MaterialStoreEntry` to include `photos: LocalPhoto[]`.
Remove the global `materialStorePhotos` state.

```typescript
type MaterialStoreEntry = {
  id: string;
  name: string;
  city: string;
  photos: LocalPhoto[];
};
```

- [ ] **Step 2: Update draft save and restore logic in useEffect**
When restoring from autosave or report data, populate the stores with their respective photos. When saving draft, map `photos` to `photoIds`.

- [ ] **Step 3: Update handleSubmit logic**
Refactor `handleSubmit` to upload each store's photos sequentially and assign them accurately.

```typescript
        const uploadedStoreFileIds: string[] = [];
        const finalizedStores = await Promise.all(
          materialStores.map(async (store) => {
            const uploaded = await uploadPhotos(store.photos, `Gagal upload foto toko ${store.name || "material"}`);
            if (!uploaded) throw new Error("Upload failed");
            uploadedStoreFileIds.push(...uploaded.fileIds);
            return {
              name: store.name.trim(),
              city: store.city.trim(),
              ...(uploaded.urls.length > 0 ? { photoUrls: uploaded.urls } : {}),
            };
          })
        );
```

- [ ] **Step 4: Update the UI (JSX)**
Remove the global `EvidenceCaptureSection` for "Toko material". Inside the `materialStores.map` block, add a photo upload component specifically for that store (can use a simplified mini-gallery or standard input pattern used in the app).

### Task 3: Update Completion Work Types and Autosave

**Files:**
- Modify: `app/reports/[reportNumber]/completion/types.ts`
- Modify: `app/reports/[reportNumber]/completion/hooks/use-completion-autosave.ts`

**Interfaces:**
- Consumes: Existing IndexedDB photos and local storage data
- Produces: Updated draft types for completion forms.

- [ ] **Step 1: Update CompletionDraftData in types.ts**
Add `photoIds: string[]` to `StartWorkMaterialStoreDraft`. Bump version to 3. Add `StartWorkMaterialStoreEntry` with `photos: LocalPhoto[]`.

- [ ] **Step 2: Update use-completion-autosave.ts**
Modify `restoreDraft` to handle version 3, and restore nested photos for `startWorkMaterialStores`.

### Task 4: Refactor Completion Work Form State and UI

**Files:**
- Modify: `app/reports/[reportNumber]/completion/use-completion-work-form.ts`
- Modify: `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`

**Interfaces:**
- Consumes: Updated completion autosave from Task 3.

- [ ] **Step 1: Update use-completion-work-form.ts state**
Remove `startWorkMaterialStorePhotos` global state. Ensure `startWorkMaterialStores` state contains `photos: LocalPhoto[]`. Update `buildDraftData` to map `photoIds`.

- [ ] **Step 2: Update handleSubmit in use-completion-work-form.ts**
Refactor the `shouldReviseStartWork` upload logic to loop through `startWorkMaterialStores`, upload their photos, and map them precisely.

- [ ] **Step 3: Update start-work-revision-section.tsx UI**
Remove the global "Toko material" upload section. Add the photo upload capability directly inside the mapped "Toko X" cards, exactly as done in Task 2.
