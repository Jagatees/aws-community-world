import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildGoldenJackets, parseCommunityDirectory } from './update-golden-jackets.mjs';

const entry = (id, title, bodyBack) => ({ item: { id: `directory#${id}`, additionalFields: { title, bodyBack } } });
const awsPayload = { items: [
  entry('prabhu-jayaseelan', 'Prabhu Jayaseelan (Virtusa)', 'He is a recipient of the AWS Golden Jacket.'),
  entry('mai-nishitani', 'Mai Nishitani (Megaport)', 'Working toward the Golden Jacket with 12 certifications.'),
  entry('not-reviewed', 'Another Person', 'I mentor Golden Jacket recipients.'),
  entry('josé-carvalheira-accenture', 'José Carlos Carvalheira (Accenture)', 'he has been a Gold Jacket'),
], metadata: { totalHits: 4 } };
const card = (name, label, location = 'São Paulo, SP, Brazil') => `<div class="member-card"><h3>${name}</h3><div class="location">${location}</div><span class="tag">${label}</span></div>`;
const html = `<section id="members">${card('José Carvalheira', 'Golden Jacket')}</section><section id="alumni">${card('Former Recipient', 'Alumni')}</section><section id="challengers">${card('Still Studying', 'Golden Jacket aspirant')}</section>`;
const community = await parseCommunityDirectory(html);
assert.equal(community.length, 2, 'Challengers must not be imported');
const records = buildGoldenJackets(awsPayload, community, {}, '2026-09-11');
assert.equal(records.length, 3, 'Recipient evidence and cross-source deduplication');
assert.ok(!records.some((r) => r.name === 'Mai Nishitani' || r.name === 'Another Person'));
assert.equal(records.find((r) => r.name === 'Former Recipient').recognitionStatus, 'alumni');
const jose = records.find((r) => r.name === 'José Carlos Carvalheira');
assert.equal(jose.country, 'Brazil');
assert.equal(jose.coordinatePrecision, 'country');
assert.equal(jose.sourceLabel, 'AWS Ambassador biography');
assert.ok(jose.locationSourceUrl.includes('goldenjacketsbrazil.com'));
assert.equal(records.find((r) => r.name === 'Prabhu Jayaseelan').lat, 0, 'Unconfirmed countries stay off the globe');
assert.throws(() => buildGoldenJackets(awsPayload, [], {}, '2026-09-11'), /empty/);
assert.throws(() => buildGoldenJackets(awsPayload, [...community, community[0]], {}, '2026-09-11'), /Duplicate/);
assert.throws(() => buildGoldenJackets(awsPayload, [{ ...community[0], location: 'Boston, United States' }], {}, '2026-09-11'), /Review the country/);
const data = JSON.parse(await readFile(new URL('../src/data/golden-jackets.json', import.meta.url), 'utf8'));
assert.equal(new Set(data.map((r) => r.id)).size, data.length);
for (const record of data) {
  assert.ok(record.name && record.sourceUrl && record.sourceLabel && record.verifiedAt);
  assert.ok(['recipient', 'alumni'].includes(record.recognitionStatus));
  assert.ok(Math.abs(record.lat) <= 90 && Math.abs(record.lng) <= 180);
  assert.equal(Boolean(record.country), record.lat !== 0 || record.lng !== 0);
}
console.log(`Golden Jacket data checks passed (${data.length} profiles): documented recognition, alumni, deduplication, source links and conservative locations.`);
