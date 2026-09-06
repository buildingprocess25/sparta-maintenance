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
export function getReportBrandWhere(brandFilter: StoreBrandFilter): Prisma.ReportWhereInput | undefined {
  if (brandFilter === 'ALL') {
    return undefined;
  }
  
  return {
    storeCode: { not: null },
    store: getStoreBrandWhere(brandFilter)
  };
}

export function getVisibleBrandBranchNames(
  brand: StoreBrandFilter,
  allBranchNames: Iterable<string>,
  ownedBranchNames: Iterable<string>,
) {
  return new Set(brand === 'ALL' ? allBranchNames : ownedBranchNames);
}

