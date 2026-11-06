import { Prisma } from '@prisma/client';

export type StoreBrandFilter = 'ALL' | 'ALFAMART' | 'LAWSON';

export const STORE_BRAND_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'ALFAMART', label: 'Alfamart' },
  { value: 'LAWSON', label: 'Lawson' },
];

export function parseStoreBrandFilter(value: unknown): StoreBrandFilter | null {
  if (value === undefined || value === null || value === '') return 'ALL';
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  return upper === 'ALL' || upper === 'ALFAMART' || upper === 'LAWSON'
    ? upper
    : null;
}

export function normalizeStoreBrandFilter(value?: string | null): StoreBrandFilter {
  return parseStoreBrandFilter(value) ?? 'ALL';
}

export function getStoreBrandExportLabel(value?: string | null): "Alfamart" | "Lawson" {
  return value?.trim().toUpperCase() === "LAWSON" ? "Lawson" : "Alfamart";
}

export function getStoreBrandWhere(brandFilter: StoreBrandFilter): Prisma.StoreWhereInput | undefined {
  if (brandFilter === 'LAWSON') {
    return {
      brand: { equals: 'LAWSON', mode: 'insensitive' },
    };
  }
  if (brandFilter === 'ALFAMART') {
    return {
      OR: [
        { brand: null },
        { brand: '' },
        { brand: { not: 'LAWSON', mode: 'insensitive' } },
      ],
    };
  }
  return undefined;
}

export function buildPjumBrandWhere(
  baseWhere: Prisma.PjumExportWhereInput,
  brandFilter: StoreBrandFilter,
  reportNumbers: string[],
): Prisma.PjumExportWhereInput {
  if (brandFilter === "ALL") return baseWhere;
  return { ...baseWhere, reportNumbers: { hasSome: reportNumbers } };
}
/**
 * Tipe toko Alfamart (Store.ownershipType). Hanya berlaku bersama brand ALFAMART;
 * untuk brand lain filter ini diabaikan.
 */
export type StoreTypeFilter = 'ALL' | 'REGULAR' | 'FRANCHISE' | 'UNKNOWN';

export const STORE_TYPE_OPTIONS: { value: Exclude<StoreTypeFilter, 'ALL'>; label: string }[] = [
  { value: 'REGULAR', label: 'Reguler' },
  { value: 'FRANCHISE', label: 'Franchise' },
  { value: 'UNKNOWN', label: 'Belum diketahui' },
];

export function parseStoreTypeFilter(value: unknown): StoreTypeFilter | null {
  if (value === undefined || value === null || value === '') return 'ALL';
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  return upper === 'ALL' || upper === 'REGULAR' || upper === 'FRANCHISE' || upper === 'UNKNOWN'
    ? upper
    : null;
}

export function normalizeStoreTypeFilter(value?: string | null): StoreTypeFilter {
  return parseStoreTypeFilter(value) ?? 'ALL';
}

/** Tipe toko hanya bermakna untuk brand Alfamart. */
export function resolveStoreTypeFilter(
  brandFilter: StoreBrandFilter,
  storeType: StoreTypeFilter,
): StoreTypeFilter {
  return brandFilter === 'ALFAMART' ? storeType : 'ALL';
}

export function getReportBrandWhere(
  brandFilter: StoreBrandFilter,
  storeType: StoreTypeFilter = 'ALL',
): Prisma.ReportWhereInput | undefined {
  if (brandFilter === 'ALL') {
    return undefined;
  }

  const brandWhere = getStoreBrandWhere(brandFilter);
  const effectiveStoreType = resolveStoreTypeFilter(brandFilter, storeType);

  return {
    storeCode: { not: null },
    store:
      effectiveStoreType === 'ALL'
        ? brandWhere
        : { AND: [brandWhere ?? {}, { ownershipType: effectiveStoreType }] },
  };
}

export function getVisibleBrandBranchNames(
  brand: StoreBrandFilter,
  allBranchNames: Iterable<string>,
  ownedBranchNames: Iterable<string>,
) {
  return new Set(brand === 'ALL' ? allBranchNames : ownedBranchNames);
}

