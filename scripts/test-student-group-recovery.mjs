import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadStudentGroupMapData } from '../src/utils/studentGroupData.js';

test('healthy summary never requests the full dataset', async () => {
  const summary = [{ id: 'sbg-1', name: 'Campus' }];
  const result = await loadStudentGroupMapData(async () => ({ default: summary }), () => assert.fail('unnecessary full data download'));
  assert.equal(result, summary);
});

test('missing or invalid summary falls back to intact full profiles', async () => {
  const full = [{ id: 'sbg-1', name: 'Campus', ledBy: [{ name: 'Leader', socialLinks: { linkedin: 'https://example.com/leader' } }] }];
  for (const loadSummary of [async () => { throw new TypeError('Failed to fetch dynamically imported module'); }, async () => ({ default: {} })]) {
    let calls = 0;
    const result = await loadStudentGroupMapData(loadSummary, async () => { calls++; return { default: full }; });
    assert.equal(result, full);
    assert.equal(calls, 1);
    assert.equal(result[0].ledBy[0].name, 'Leader');
  }
});

test('when both sources fail, surface the error rather than a successful zero count', async () => {
  const fail = async () => { throw new Error('Network offline'); };
  await assert.rejects(loadStudentGroupMapData(fail, fail), /Network offline/);
  await assert.rejects(loadStudentGroupMapData(fail, async () => ({ default: null })), /Invalid student group data/);
});

test('a later retry can recover after a transient failure', async () => {
  let offline = true;
  const load = async () => {
    if (offline) throw new Error('Network offline');
    return { default: [{ id: 'restored' }] };
  };
  await assert.rejects(loadStudentGroupMapData(load, load));
  offline = false;
  assert.equal((await loadStudentGroupMapData(load, load))[0].id, 'restored');
});
