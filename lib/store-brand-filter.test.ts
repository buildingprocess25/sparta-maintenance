import test from 'node:test';
import * as assert from 'node:assert';
import {
  normalizeStoreBrandFilter,
  parseStoreBrandFilter,
  getStoreBrandExportLabel,
  getStoreBrandWhere,
  getReportBrandWhere,
  getVisibleBrandBranchNames,
} from './store-brand-filter';

test('normalizeStoreBrandFilter', () => {
  assert.strictEqual(normalizeStoreBrandFilter(undefined), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter(null), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter(''), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter('lawson'), 'LAWSON');
  assert.strictEqual(normalizeStoreBrandFilter('ALFAMART'), 'ALFAMART');
  assert.strictEqual(normalizeStoreBrandFilter('invalid'), 'ALL');
});

test('parseStoreBrandFilter rejects invalid request values', () => {
  assert.strictEqual(parseStoreBrandFilter(undefined), 'ALL');
  assert.strictEqual(parseStoreBrandFilter('lawson'), 'LAWSON');
  assert.strictEqual(parseStoreBrandFilter('other'), null);
  assert.strictEqual(parseStoreBrandFilter({ brand: 'LAWSON' }), null);
});

test('getStoreBrandExportLabel formats report export brand values', () => {
  assert.strictEqual(getStoreBrandExportLabel('LAWSON'), 'Lawson');
  assert.strictEqual(getStoreBrandExportLabel('lawson'), 'Lawson');
  assert.strictEqual(getStoreBrandExportLabel(null), 'Alfamart');
  assert.strictEqual(getStoreBrandExportLabel(''), 'Alfamart');
  assert.strictEqual(getStoreBrandExportLabel('ALFAMART'), 'Alfamart');
});

test('getStoreBrandWhere', () => {
  assert.strictEqual(getStoreBrandWhere('ALL'), undefined);
  
  assert.deepStrictEqual(getStoreBrandWhere('LAWSON'), {
    brand: {
      equals: 'LAWSON',
      mode: 'insensitive'
    }
  });

  // Alfamart includes null/empty/non-Lawson values
  assert.deepStrictEqual(getStoreBrandWhere('ALFAMART'), {
    OR: [
      { brand: null },
      { brand: '' },
      { brand: { not: 'LAWSON', mode: 'insensitive' } }
    ]
  });
});

test('getReportBrandWhere', () => {
  assert.strictEqual(getReportBrandWhere('ALL'), undefined);
  
  // A selected brand excludes reports without a resolvable Store.
  assert.deepStrictEqual(getReportBrandWhere('LAWSON'), {
    storeCode: { not: null },
    store: {
      brand: {
        equals: 'LAWSON',
        mode: 'insensitive'
      }
    }
  });

  assert.deepStrictEqual(getReportBrandWhere('ALFAMART'), {
    storeCode: { not: null },
    store: {
      OR: [
        { brand: null },
        { brand: '' },
        { brand: { not: 'LAWSON', mode: 'insensitive' } }
      ]
    }
  });
});

test('getVisibleBrandBranchNames keeps all branches only for ALL', () => {
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('ALL', ['A', 'B'], ['B']),
    new Set(['A', 'B']),
  );
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('LAWSON', ['A', 'B'], ['B']),
    new Set(['B']),
  );
  assert.deepStrictEqual(
    getVisibleBrandBranchNames('ALFAMART', ['A', 'B'], []),
    new Set(),
  );
});

