# Wajib PJUM Policy Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah fungsi penentu agar semua laporan yang selesai diwajibkan untuk di-PJUM-kan tanpa pengecualian.

**Architecture:** Memanfaatkan teknik *feature-toggle* pada fungsi `requiresPjum` di `lib/realisasi.ts` dengan selalu me-*return* nilai `true`. Pendekatan ini menghindari perombakan pada lapisan UI dan mudah di-*revert*.

**Tech Stack:** TypeScript, Next.js, Vitest

## Global Constraints

- Jangan mengubah UI/komponen React. Biarkan *logic* *backend/domain* yang menanganinya.
- Jangan menghapus blok kode fungsi lama, cukup beri *comment* sebagai referensi masa depan.
- Perbarui test yang terdampak.

---

### Task 1: Update Domain Logic

**Files:**
- Modify: `lib/realisasi.ts:208-213`

**Interfaces:**
- Consumes: N/A
- Produces: `requiresPjum(totalReal: unknown, items: unknown): boolean` yang selalu mengembalikan `true`.

- [ ] **Step 1: Write minimal implementation**

Ubah file `lib/realisasi.ts`:
```typescript
export function requiresPjum(totalReal: unknown, items: unknown): boolean {
    return true;
    /*
    return (
        resolveReportTotalRealisasi(totalReal, items) > 0 ||
        hasBmsHandledItems(items)
    );
    */
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/realisasi.ts
git commit -m "feat: enforce mandatory pjum for all reports"
```

---

### Task 2: Fix Failing Unit Tests

**Files:**
- Modify: `lib/realisasi.spec.ts:237-266`
- Modify: `lib/pjum-hanging.spec.ts:61-63`

**Interfaces:**
- Consumes: `requiresPjum` from Task 1

- [ ] **Step 1: Run tests to verify failures**

Run: `npx vitest run lib/realisasi.spec.ts lib/pjum-hanging.spec.ts`
Expected: FAIL pada asersi `requiresPjum` yang tadinya mengharapkan nilai `false`.

- [ ] **Step 2: Fix realisasi.spec.ts**

Ubah asersi yang bernilai `false` menjadi `true` beserta pesannya di `lib/realisasi.spec.ts`:

```typescript
assert.equal(
    requiresPjum(0, [{ ...items[0], handler: "REKANAN", realisasiItems: [] }]),
    true,
    "Semua laporan kini wajib PJUM",
);

assert.equal(
    requiresPjum(null, [{
        ...items[0],
        discountAmount: 0,
        handler: "REKANAN",
        realisasiItems: [{ id: "dirty-data", reportItemId: "item-1", name: "Test Dirty Data", price: 1000, quantity: 1, totalPrice: 1000 }]
    }]),
    true,
    "Semua laporan kini wajib PJUM",
);

assert.equal(
    requiresPjum(null, [{
        ...items[0],
        discountAmount: 0,
        handler: "BMS", // handler nyangkut
        condition: "BAIK", // tapi kondisi barangnya baik
        preventiveCondition: null,
        realisasiItems: []
    }]),
    true,
    "Semua laporan kini wajib PJUM",
);
```

- [ ] **Step 3: Fix pjum-hanging.spec.ts**

Di dalam `lib/pjum-hanging.spec.ts`, cari blok objek `nonPjumReport` dan ubah properti `requiresPjum` menjadi `true`:

```typescript
        const nonPjumReport = {
            reportNumber: "REP-06",
            createdAt: lastMonthStart,
            status: "COMPLETED",
            totalReal: 0,
            items: [],
            pjumHangingAt: null,
            requiresPjum: true, // Diubah menjadi true
        };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/realisasi.spec.ts lib/pjum-hanging.spec.ts`
Expected: PASS untuk semua tes.

- [ ] **Step 5: Commit**

```bash
git add lib/realisasi.spec.ts lib/pjum-hanging.spec.ts
git commit -m "test: update specs to expect mandatory pjum"
```
