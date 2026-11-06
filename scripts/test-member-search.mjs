import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { getMemberSearchText, getSearchFocusTarget } from '../src/utils/memberSearch.js';

test('the real Jagatees leader record is searchable without changing the group data', async () => {
  const groups = JSON.parse(await readFile(new URL('../src/data/cloud-clubs.json', import.meta.url), 'utf8'));
  const matches = groups.filter((group) => getMemberSearchText(group).includes('jagatees'));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, 'AWS Student Builder Group at Singapore Institute of Technology');
  assert.ok(getMemberSearchText(matches[0]).includes('singapore'));
  assert.ok(!getMemberSearchText(matches[0]).includes('[object object]'));
});

test('normalized specialties, locations, event details and leader names share one search index', () => {
  const members = [
    { name: 'Asha', heroType: 'Machine Learning', specialization: 'Containers', country: 'Kenya', city: 'Nairobi' },
    { name: 'Builder Loft', address: '25 Market Street', offerings: ['Coworking', 'Office hours'] },
    { name: 'Community Meetup', tags: ['Serverless'], eventFormat: 'Hybrid', ledBy: [{ name: 'Mei Lin' }, 'Alex', null] },
  ];
  const find = (query) => members.filter((member) => getMemberSearchText(member).includes(query)).map((member) => member.name);
  for (const query of ['machine learning', 'containers', 'kenya', 'nairobi']) assert.deepEqual(find(query), ['Asha']);
  for (const query of ['market street', 'coworking']) assert.deepEqual(find(query), ['Builder Loft']);
  for (const query of ['mei lin', 'alex', 'hybrid', 'serverless']) assert.deepEqual(find(query), ['Community Meetup']);
  assert.deepEqual(find('missing-person'), []);
  assert.equal(getMemberSearchText({}), '');
});

test('search focuses one mapped location without inventing a center for unrelated results', () => {
  const singapore = { lat: 1.357107, lng: 103.8194992 };
  assert.deepEqual(getSearchFocusTarget([singapore]), singapore);
  assert.deepEqual(getSearchFocusTarget([singapore, { ...singapore }]), singapore);
  assert.equal(getSearchFocusTarget([singapore, { lat: 35.68, lng: 139.69 }]), null);
  assert.equal(getSearchFocusTarget([]), null);
  assert.equal(getSearchFocusTarget([{ lat: 0, lng: 0 }]), null);
  assert.equal(getSearchFocusTarget([{ lat: null, lng: null }]), null);
});
