// Publicly documented recognition, not a live certification-status registry.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { API_URL, normalizeAmbassadors } from './update-aws-ambassadors.mjs';

const COMMUNITY_URL = 'https://goldenjacketsbrazil.com/';
const DATA_URL = new URL('../src/data/golden-jackets.json', import.meta.url);

// Reviewed, explicit recipient statements from AWS's Ambassador biographies.
// Certification counts alone, aspirations and mentions of other recipients do
// not qualify. Changed text removes the record until it can be reviewed again.
const AWS_RECIPIENTS = {
  'donghee-kim': 'AWS 13x Certified professional (Golden Jacket)',
  'prabhu-jayaseelan': 'recipient of the AWS Golden Jacket',
  'mai-nishitani': 'Holding 14 AWS certification with a golden jacket',
  'surjeet-singh-sachdeva': 'double AWS Golden Jacket recipient',
  'josé-carvalheira-accenture': 'he has been a Gold Jacket',
  'dr-rahul-gaikwad-ibm-': 'recipient of the prestigious AWS Golden Jacket',
  'crhistian-cardona': 'Crhistian is fully AWS Certified and AWS Golden Jacket',
  'karan-vichare-8a1127363930': 'a proud recipient of the AWS Golden Jacket',
  'karam-kim-b3c76f20b08e': 'he was awarded the Golden Jacket',
  'sagar-donthineni-deloitt': 'Sagar has earned the esteemed AWS Gold Jacket',
};

function plainText(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function identity(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function publicUrl(value, base) {
  if (!value) return '';
  try { const url = new URL(value, base); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

export async function parseCommunityDirectory(html) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // Parse inert HTML: no remote scripts, forms, or media are executed.
    return await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      return [...doc.querySelectorAll('#members .member-card, #alumni .member-card')].map((card) => ({
        name: card.querySelector('h3')?.textContent.trim(),
        location: card.querySelector('.location')?.textContent.trim(),
        avatar: card.querySelector('img.photo')?.getAttribute('src'),
        profile: card.querySelector('.socials a')?.getAttribute('href'),
        alumni: card.closest('section')?.id === 'alumni',
        tags: [...card.querySelectorAll('.tag')].map((tag) => tag.textContent.trim()),
      }));
    }, html);
  } finally { await browser.close(); }
}

export function buildGoldenJackets(awsPayload, communityRows, geoCache, checkedAt) {
  const ambassadors = normalizeAmbassadors(awsPayload, checkedAt);
  const byId = new Map(ambassadors.map((record) => [record.id.replace('aws-ambassadors-', ''), record]));
  const records = new Map();
  for (const { item } of awsPayload.items) {
    const slug = item.id.split('#').at(-1);
    const evidence = AWS_RECIPIENTS[slug];
    if (!evidence || !plainText(item.additionalFields.bodyBack).includes(evidence)) continue;
    const ambassador = byId.get(slug);
    records.set(identity(ambassador.name), {
      ...ambassador, id: `golden-jackets-${slug}`, relatedProfileId: ambassador.id,
      tag: 'AWS biography', recognitionStatus: 'recipient',
      sourceLabel: 'AWS Ambassador biography',
    });
  }
  if (!communityRows.length) throw new Error('Community directory is empty; keeping existing data.');
  const seen = new Set();
  for (const row of communityRows) {
    if (!row.name || !row.location || (!row.alumni && !row.tags.includes('Golden Jacket'))) {
      throw new Error('Unexpected community card; keeping existing data.');
    }
    if (!/\bBrazil\b/i.test(row.location) && identity(row.location) !== 'sao-paulo') {
      throw new Error(`Review the country before mapping ${row.name}: ${row.location}`);
    }
    // José's community entry uses his shortened name; preserve one record.
    const key = identity(row.name === 'José Carvalheira' ? 'José Carlos Carvalheira' : row.name);
    if (seen.has(key)) throw new Error('Duplicate community profile; keeping existing data.');
    seen.add(key);
    const existing = records.get(key);
    const cityKey = `${row.location.split(',')[0].toLowerCase()}, brazil`;
    const coords = [geoCache[row.location.toLowerCase()], geoCache[cityKey]].find((point) =>
      point && Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
      point.lat >= -34 && point.lat <= 6 && point.lng >= -74 && point.lng <= -34
    );
    const sourceUrl = `${COMMUNITY_URL}#${row.alumni ? 'alumni' : 'members'}`;
    const profileUrl = publicUrl(row.profile) || sourceUrl;
    records.set(key, {
      ...existing,
      id: existing?.id || `golden-jackets-${key}`,
      name: existing?.name || row.name,
      avatarUrl: publicUrl(row.avatar, COMMUNITY_URL),
      profileUrl, ctaLabel: 'View profile',
      location: /brazil/i.test(row.location) ? row.location : `${row.location}, Brazil`,
      country: 'Brazil', lat: coords?.lat ?? -14.24, lng: coords?.lng ?? -51.93,
      coordinatePrecision: coords ? 'city' : 'country',
      locationSource: 'community-directory',
      description: existing?.description || (row.alumni ? 'Previously recognized; listed as alumni by Golden Jackets Brazil.' : 'Listed as a Golden Jacket holder by Golden Jackets Brazil.'),
      tag: row.alumni ? 'Alumni' : existing ? 'AWS biography' : 'Community directory',
      recognitionStatus: row.alumni ? 'alumni' : 'recipient',
      sourceUrl: existing?.sourceUrl || sourceUrl,
      sourceLabel: existing?.sourceLabel || 'Golden Jackets Brazil (independent community)',
      locationSourceUrl: sourceUrl,
      verifiedAt: checkedAt,
    });
  }
  const result = [...records.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (!result.length || new Set(result.map((record) => record.id)).size !== result.length) throw new Error('Invalid Golden Jacket dataset.');
  return result;
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public directory returned ${response.status}: ${url}`);
  return response.text();
}
async function main() {
  const [awsPath, communityPath] = process.argv.slice(2);
  const [awsText, communityHtml, geoText] = await Promise.all([
    awsPath ? readFile(awsPath, 'utf8') : fetchText(API_URL),
    communityPath ? readFile(communityPath, 'utf8') : fetchText(COMMUNITY_URL),
    readFile(new URL('./.geo-cache.json', import.meta.url), 'utf8'),
  ]);
  const rows = await parseCommunityDirectory(communityHtml);
  const records = buildGoldenJackets(JSON.parse(awsText), rows, JSON.parse(geoText), new Date().toISOString().slice(0, 10));
  const tempUrl = new URL(`${DATA_URL.href}.tmp`);
  await writeFile(tempUrl, `${JSON.stringify(records, null, 2)}\n`);
  await rename(tempUrl, DATA_URL);
  console.log(`${records.length} documented Golden Jacket recipients; ${records.filter((r) => r.country).length} mapped across ${new Set(records.map((r) => r.country).filter(Boolean)).size} countries; ${records.filter((r) => r.recognitionStatus === 'alumni').length} alumni. This is a growing directory, not a global census.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
