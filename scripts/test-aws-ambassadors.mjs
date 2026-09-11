import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeAmbassadors } from './update-aws-ambassadors.mjs';

const entry = (id, tags = [], bodyBack = '') => ({ item: { id: `directory#${id}`, additionalFields: { title: 'Test Person (Test Partner)', body: 'Cloud Architect', bodyBack, primaryCTALink: 'https://partners.amazonaws.com/partners/test' } }, tags });
const payload = (items) => ({ items, metadata: { totalHits: items.length } });
const broadRegion = { id: 'GLOBAL#local-tags-location#apac', tagNamespaceId: 'GLOBAL#local-tags-location', name: 'APAC' };
const countryTag = { id: 'GLOBAL#location-countries#singapore', tagNamespaceId: 'GLOBAL#location-countries', name: 'Singapore' };
const [unknown, known, reviewed, changed] = normalizeAmbassadors(payload([
  entry('unknown', [broadRegion]), entry('known', [countryTag]),
  entry('gokul-balakrishnan', [], 'Gokul is based in Singapore'),
  entry('nick-little-cybercx', [], 'Biography no longer identifies a location.'),
]), '2026-09-11');
assert.equal(unknown.country, '');
assert.equal(unknown.lat, 0);
assert.equal(unknown.lng, 0);
assert.equal(known.country, 'Singapore');
assert.equal(known.coordinatePrecision, 'country');
assert.equal(reviewed.locationSource, 'official-biography');
assert.equal(changed.country, '');
assert.throws(() => normalizeAmbassadors({ items: [entry('one')], metadata: { totalHits: 360 } }), /Incomplete/);
assert.throws(() => normalizeAmbassadors(payload([entry('same'), entry('same')])), /duplicate/);
const records = JSON.parse(await readFile(new URL('../src/data/aws-ambassadors.json', import.meta.url), 'utf8'));
assert.equal(new Set(records.map((r) => r.id)).size, records.length);
for (const record of records) {
  assert.ok(record.name && record.sourceUrl && record.verifiedAt);
  assert.ok(Math.abs(record.lat) <= 90 && Math.abs(record.lng) <= 180);
  assert.equal(Boolean(record.country), record.lat !== 0 || record.lng !== 0);
}
console.log(`Ambassador data checks passed (${records.length} records); broad regions stay unmapped and incomplete refreshes are rejected.`);
