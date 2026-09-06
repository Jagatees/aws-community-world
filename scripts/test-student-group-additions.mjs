import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { includeStudentGroupAdditions } from './student-group-additions.mjs';
import { COUNTRY_SPOTLIGHTS } from '../src/config/countrySpotlights.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));
const additions = read('student-builder-group-additions');
const groups = read('cloud-clubs');

test('verified group survives a directory omission without changing upstream records', () => {
  const upstream = [{ name: 'Another group', joinUrl: 'https://example.com/group/' }];
  const result = includeStudentGroupAdditions(upstream, additions);
  assert.equal(result.length, upstream.length + additions.length);
  assert.equal(result[0], upstream[0]);
  assert.equal(upstream.length, 1);
  assert.equal(includeStudentGroupAdditions(result, additions).length, result.length);
});

test('a returning upstream record wins despite a trailing slash difference', () => {
  const current = { ...additions[0], name: 'Updated upstream name', joinUrl: additions[0].joinUrl.replace(/\/$/, '') };
  assert.deepEqual(includeStudentGroupAdditions([current], additions), [current]);
});

test('ITUM exists once with matching spotlight coordinates and usable leader links', () => {
  const matches = groups.filter((group) => group.joinUrl === additions[0].joinUrl);
  assert.equal(matches.length, 1);
  const group = matches[0];
  assert.deepEqual(COUNTRY_SPOTLIGHTS['Sri Lanka'].memberCoordinates[group.id], { lat: group.lat, lng: group.lng });
  assert.equal(Object.keys(COUNTRY_SPOTLIGHTS['Sri Lanka'].memberCoordinates).length, 11);
  assert.ok(group.ledBy[0].profileUrl.startsWith('https://builder.aws.com/'));
  assert.ok(group.ledBy[0].socialLinks.github.startsWith('https://'));
  assert.equal(new Set(groups.map((entry) => entry.id)).size, groups.length);
});
