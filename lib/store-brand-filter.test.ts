import test from 'node:test';
import * as assert from 'node:assert';
import {
  normalizeStoreBrandFilter,
  getStoreBrandWhere,
  getReportBrandWhere,
} from './store-brand-filter';

test('normalizeStoreBrandFilter', () => {
  assert.strictEqual(normalizeStoreBrandFilter(undefined), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter(null), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter(''), 'ALL');
  assert.strictEqual(normalizeStoreBrandFilter('lawson'), 'LAWSON');
  assert.strictEqual(normalizeStoreBrandFilter('ALFAMART'), 'ALFAMART');
  assert.strictEqual(normalizeStoreBrandFilter('invalid'), 'ALL');
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
