import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildCatalog, extractWorkshops, publicUrl } from './update-workshops.mjs';
import { DEFAULT_WORKSHOP_FILTERS as defaults, readWorkshopFilters, writeWorkshopParams, countServiceWorkshops, filterServices, filterWorkshops } from '../src/utils/workshops.js';

const product = (id, title, categories = ['databases']) => ({ item: { name: id, additionalFields: { title, body: '<p>Build &amp; learn</p>', ctaLink: `/${id}/?tracking=1`, badge: '{"value":["Fallback"]}' } }, tags: categories.map(name => ({ tagNamespaceId: 'GLOBAL#aws-tech-category', name })) });
const workshop = (id, services, level = 'Intermediate - 200', hours = '3') => ({ contentId: id, title: `Learn ${id}`, description: 'Practical database skills', catalogUrl: `https://catalog.workshops.aws/workshops/${id}`, localeCodes: ['en-US', 'ja-JP'], lastUpdatedAt: '2026-10-01T00:00:00Z', attributes: [
  { name: 'AWS services', value: { stringListValue: services } }, { name: 'Complexity level', value: { stringValue: level } }, { name: 'Recommended duration', value: { stringValue: hours } },
] });
const products = { items: [product('rds', 'Amazon RDS'), product('iam', 'AWS Identity and Access Management', ['security-identity-compliance']), product('lambda', 'AWS Lambda', ['serverless', 'compute']), product('lambda-copy', 'AWS Lambda', ['compute'])], metadata: { totalHits: 4 } };
const raw = [workshop('postgres', ['Amazon RDS for PostgreSQL', 'Amazon RDS']), { ...workshop('security', ['AWS Identity & Access Management (IAM)'], 'Foundational - 100', '1'), demoEnabled: true }, workshop('advanced', ['AWS Lambda'], 'Advanced - 300', '8'), workshop('unknown', ['AWS Lambda'], '', '')];
const fixture = buildCatalog(raw, products, '2026-10-17T00:00:00Z');

test('imports aliases and feature-parent associations without duplicate counts', () => {
  assert.equal(fixture.productCount, 3);
  assert.equal(fixture.services.length, 4);
  assert.equal(countServiceWorkshops(fixture.workshops).get('rds'), 1);
  assert.deepEqual(fixture.workshops.find(item => item.id === 'security').serviceIds, ['iam']);
  assert.equal(fixture.services.find(service => service.id === 'rds').url, 'https://aws.amazon.com/rds/');
  assert.equal(fixture.services.find(service => service.id === 'rds').description, 'Build & learn');
  assert.equal(filterServices(fixture, defaults, 'IAM')[0].id, 'iam');
  assert.equal(filterWorkshops(fixture, { ...defaults, service: 'rds' }).length, 1);
});

test('uses all official technology categories for filtering', () => {
  for (const category of ['Compute', 'Serverless']) {
    assert.deepEqual(filterServices(fixture, { ...defaults, category }).map(item => item.id), ['lambda']);
    assert.equal(filterWorkshops(fixture, { ...defaults, category }).length, 2);
  }
});

test('combines level, language, duration, sandbox and search filters', () => {
  assert.deepEqual(filterWorkshops(fixture, { ...defaults, level: '100', language: 'ja', duration: 'short', sandbox: true }, 'security').map(item => item.id), ['security']);
  assert.equal(filterWorkshops(fixture, { ...defaults, language: 'es' }).length, 0);
  assert.equal(filterWorkshops(fixture, { ...defaults, duration: 'medium' }).length, 1);
  assert.equal(filterWorkshops(fixture, { ...defaults, duration: 'long' }).length, 1);
  assert.equal(filterWorkshops(fixture, { ...defaults, service: 'missing-service' }).length, 0);
});

test('duration sorting puts missing metadata last; title sort is deterministic', () => {
  assert.deepEqual(filterWorkshops(fixture, { ...defaults, sort: 'duration' }).map(item => item.id), ['security', 'postgres', 'advanced', 'unknown']);
  assert.deepEqual(filterWorkshops(fixture, { ...defaults, sort: 'title' }).map(item => item.id), ['advanced', 'postgres', 'security', 'unknown']);
});

test('rejects incomplete source payloads and duplicate workshop IDs', () => {
  assert.throws(() => buildCatalog(raw, { ...products, metadata: { totalHits: 5 } }), /Incomplete/);
  assert.throws(() => buildCatalog([raw[0], raw[0]], products), /duplicate/);
  assert.throws(() => buildCatalog([], products), /Empty/);
  assert.throws(() => extractWorkshops('<html>unavailable</html>'), /missing/);
  const state = { workshops: { queries: [{ queryKey: ['workshops', 'list', 'en'], state: { data: raw } }] } };
  assert.deepEqual(extractWorkshops(`<script id="__bingo-ssr-query-state__" type="application/json">${JSON.stringify(state)}</script>`), raw);
});

test('accepts official public links and rejects unsafe or unrelated destinations', () => {
  assert.equal(publicUrl('/quick/', 'aws.amazon.com'), 'https://aws.amazon.com/quick/');
  assert.equal(publicUrl('https://kiro.dev/', 'aws.amazon.com'), 'https://kiro.dev/');
  for (const url of ['javascript:alert(1)', 'https://evil.example/workshop', 'https://aws.amazon.com.evil.example/', 'http://aws.amazon.com/']) assert.throws(() => publicUrl(url, 'aws.amazon.com'));
  assert.throws(() => publicUrl(undefined, 'workshops.aws'));
});

test('URL filters round-trip with enum validation and remove stale values', () => {
  const filters = { ...defaults, mode: 'world', service: 'rds', level: '300', language: 'ja', duration: 'long', sort: 'duration', sandbox: true };
  const params = new URLSearchParams('view=workshops');
  writeWorkshopParams(params, filters);
  assert.deepEqual(readWorkshopFilters(params), filters);
  writeWorkshopParams(params, defaults);
  assert.equal(params.toString(), 'view=workshops');
  assert.deepEqual(readWorkshopFilters(new URLSearchParams('mode=invalid&level=900&sort=random&duration=0&language=invalid')), defaults);
});

test('snapshot links and service associations are valid, with no orphaned workshops', async () => {
  const catalog = JSON.parse(await readFile(new URL('../src/data/workshops.json', import.meta.url), 'utf8'));
  const ids = new Set(catalog.services.map(service => service.id));
  assert.equal(ids.size, catalog.services.length);
  assert.equal(new Set(catalog.workshops.map(workshop => workshop.id)).size, catalog.workshops.length);
  for (const workshop of catalog.workshops) {
    assert.ok(workshop.title && workshop.serviceIds.length, `Missing service for ${workshop.title}`);
    assert.ok(workshop.serviceIds.every(id => ids.has(id)));
    assert.match(new URL(workshop.url).hostname, /(^|\.)workshops\.aws$/);
  }
  const counts = countServiceWorkshops(catalog.workshops);
  assert.ok(catalog.services.some(service => !counts.get(service.id)), 'Services without workshops remain browsable');
  assert.ok(filterServices(catalog, { ...defaults, withWorkshops: true }).every(service => counts.get(service.id) > 0));
});
