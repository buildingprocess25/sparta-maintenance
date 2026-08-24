# Hybrid UX Toko Material Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Start Work and Completion Work forms to allow uploading material store photos before uploading receipt photos, while locking the store name and city fields until a receipt is uploaded.

**Architecture:** We will adjust the local state management and UI components to remove the hard dependency of `materialStores` existence on `receiptPhotos`. The components will evaluate `receiptPhotos.length === 0` to conditionally disable text inputs and swap out their placeholders to guide the user, without blocking the creation of store cards or uploading store photos.

**Tech Stack:** React, Next.js, TailwindCSS

## Global Constraints

- Do not use `use client` where not already present.
- Follow existing formatting and naming conventions.
- Changes must apply to both Start Work and Completion Work flows symmetrically.

---

### Task 1: Refactor Start Work Flow (start-work-client.tsx)

**Files:**
- Modify: `app/reports/[reportNumber]/start/start-work-client.tsx`

**Interfaces:**
- Consumes: `receiptPhotos`, `materialStores` state and `handleRemoveReceiptPhoto` callback

- [ ] **Step 1: Remove `setMaterialStores([])` side-effect**
Remove the logic that wipes out the material stores array when the last receipt photo is deleted.
Modify `handleRemoveReceiptPhoto` in `start-work-client.tsx`:
```tsx
  const handleRemoveReceiptPhoto = useCallback(
    (id: string) => {
      void autosave.removePhoto(id);
      setReceiptPhotos((prev) => {
        const next = prev.filter((photo) => photo.id !== id);
        // REMOVE THIS LINE: if (next.length === 0) setMaterialStores([]);
        return next;
      });
    },
    [autosave],
  );
```

- [ ] **Step 2: Remove opacity and empty state logic**
Modify the `section` wrapper for "Data toko material" so it no longer applies `opacity-45` based on `receiptPhotos.length === 0`.
Modify the empty state condition. If `materialStores.length === 0`, the empty state text should say "Belum ada toko material. Silakan tambah toko." instead of "Data toko muncul setelah foto nota ditambahkan."

- [ ] **Step 3: Disable inputs and update placeholders**
For the `Input` (name) and `Textarea` (city) fields inside the `materialStores.map`, conditionally disable them and change placeholders based on `receiptPhotos.length === 0`.
Example:
```tsx
<Input
  placeholder={
    receiptPhotos.length === 0
      ? "Upload foto nota terlebih dahulu untuk mengisi data ini"
      : "Nama toko material"
  }
  value={store.name}
  disabled={skipPhotos || receiptPhotos.length === 0}
  onChange={(event) =>
    handleStoreChange(store.id, "name", event.target.value)
  }
/>
```

---

### Task 2: Refactor Completion Work Flow (start-work-revision-section.tsx)

**Files:**
- Modify: `app/reports/[reportNumber]/completion/components/start-work-revision-section.tsx`

**Interfaces:**
- Consumes: `receiptPhotos` prop to determine lock state

- [ ] **Step 1: Remove opacity and update empty state**
Modify the `section` wrapper for "Data toko material" so it only applies `opacity-45` for `skipPhotos`.
Change the empty state text from "Tambahkan toko material setelah foto bukti tersedia." to "Belum ada toko material. Silakan tambah toko."

- [ ] **Step 2: Disable inputs and update placeholders**
For the `Input` (name) and `Textarea` (city) fields inside the `materialStores.map`, conditionally disable them and change placeholders based on `receiptPhotos.length === 0`.

- [ ] **Step 3: Remove automatic reset in hook**
Ensure `use-completion-work-form.ts` doesn't automatically wipe out `startWorkMaterialStores` when `receiptPhotos` is empty (it currently doesn't, but verify).

---

## Verification Plan

### Manual Verification
1. Go to "Mulai Pekerjaan" form.
2. Observe that "Data toko material" is fully visible and not grayed out.
3. Click "Tambah Toko".
4. Upload a "Foto Toko" via Camera or Gallery. Ensure it succeeds.
5. Attempt to type in "Nama toko material" or "Alamat". Ensure they are disabled and show the placeholder: "Upload foto nota terlebih dahulu untuk mengisi data ini".
6. Upload a "Foto Nota".
7. Observe that the inputs become enabled and the placeholders return to normal.
8. Delete the "Foto Nota".
9. Observe that the store card remains (and keeps its photos), but the name/city inputs are disabled again.
10. Verify the identical behavior in the "Revisi Pekerjaan" (Completion Work) form.
