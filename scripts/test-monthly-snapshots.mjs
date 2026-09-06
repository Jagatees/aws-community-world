import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMonthlySnapshots } from '../src/utils/monthlySnapshots.js';

test('monthly picker uses the latest available date, preserves original indexes, and skips missing months', () => {
  const data = [{ date: '2026-06-17' }, { date: '2026-03-29' }, { date: '2026-03-31' }, { date: '2026-06-02' }];
  assert.deepEqual(getMonthlySnapshots(data), [
    { month: '2026-03', date: '2026-03-31', index: 2 },
    { month: '2026-06', date: '2026-06-17', index: 0 },
  ]);
  assert.deepEqual(getMonthlySnapshots([]), []);
  assert.equal(data.length, 4, 'original history is preserved');
});
