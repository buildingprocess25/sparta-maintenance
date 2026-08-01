import { Prisma } from '@prisma/client';

export type StoreBrandFilter = 'ALL' | 'ALFAMART' | 'LAWSON';

export const STORE_BRAND_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'ALFAMART', label: 'Alfamart' },
  { value: 'LAWSON', label: 'Lawson' },
];

export function normalizeStoreBrandFilter(value?: string | null): StoreBrandFilter {
  if (!value) return 'ALL';
  const upper = value.toUpperCase();
  if (upper === 'ALFAMART' || upper === 'LAWSON') {
    return upper as StoreBrandFilter;
  }
  return 'ALL';
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

export function getReportBrandWhere(brandFilter: StoreBrandFilter): Prisma.ReportWhereInput | undefined {
  if (brandFilter === 'ALL') {
    return undefined;
  }
  
  return {
    storeCode: { not: null },
    store: getStoreBrandWhere(brandFilter)
  };
}
