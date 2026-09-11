// Refresh the complete public directory. Only explicit country tags or reviewed
// location statements are mapped; broad regions never become guessed countries.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const SOURCE_URL = 'https://aws.amazon.com/partners/ambassadors/';
export const API_URL = 'https://aws.amazon.com/api/dirs/items/search?item.directoryId=partners-cards-interactive-apn-ambassadors-ams&item.locale=en_US&sort_by=item.additionalFields.publishedDate&sort_order=desc&size=1000';
const DATA_URL = new URL('../src/data/aws-ambassadors.json', import.meta.url);

// Approximate country centers, never personal or office addresses.
const COUNTRIES = {
  india: ['India', 22.59, 78.96], israel: ['Israel', 31.05, 34.85],
  australia: ['Australia', -25.27, 133.78], finland: ['Finland', 64, 26],
  singapore: ['Singapore', 1.3521, 103.8198], japan: ['Japan', 36.2, 138.25],
  netherlands: ['Netherlands', 52.13, 5.29], france: ['France', 46.6, 2.21],
  'united-arab-emirates': ['United Arab Emirates', 23.42, 53.85],
  'united-states': ['United States', 39.83, -98.58], ecuador: ['Ecuador', -1.83, -78.18],
  brazil: ['Brazil', -14.24, -51.93], colombia: ['Colombia', 4.57, -74.3],
  'korea-south': ['South Korea', 35.91, 127.77], korea: ['South Korea', 35.91, 127.77],
  china: ['China', 35.86, 104.2], norway: ['Norway', 60.47, 8.47],
  'new-zealand': ['New Zealand', -40.9, 174.89], germany: ['Germany', 51.17, 10.45],
  'united-kingdom': ['United Kingdom', 55.38, -3.44],
};

// Statements reviewed in the official biographies. A changed biography causes
// the override to stop applying until it is reviewed again.
const LOCATION_EVIDENCE = {
  'gokul-balakrishnan': ['singapore', 'Gokul is based in Singapore'],
  'yuki-matsumoto': ['japan', 'Japan-based IT architect'],
  'yoshiki-fujiwara': ['japan', 'based in Tokyo'],
  'sean-winters-miro': ['netherlands', 'based in the Amsterdam office'],
  'tristen-ippon-technologies': ['france', 'based in Nantes, France'],
  'vini-ganancio-1cbc52256350': ['brazil', 'Based in São Paulo'],
  'hkon-eriksen-drange-sopra-steria': ['norway', 'based in Oslo, Norway'],
  'nick-little-cybercx': ['new-zealand', 'Nick is based in Auckland, New Zealand'],
  'freddy-ho-cybercx': ['new-zealand', 'Freddy is currently based in Auckland, New Zealand'],
  'artur-schneider-tsystems': ['germany', 'lives in southern Germany'],
  'stefan-evans-consegna': ['new-zealand', 'Stefan is currently based in Wellington, New Zealand'],
  'geoff-loh-consegna': ['new-zealand', 'Architect at CyberCX based in Auckland, New Zealand'],
  'nitin-yadav-consegna': ['new-zealand', 'is now based in Auckland, New Zealand'],
  'thomas-heinen-tecracer': ['germany', 'Senior AWS Consultant in Germany'],
  'ross-chernick-pwc': ['united-states', 'based out of New York'],
};

function plainText(value = '') {
  const entities = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘' };
  return value.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code) => {
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(code[1] === 'x' ? 2 : 1), code[1] === 'x' ? 16 : 10));
    return entities[code] ?? match;
  }).replace(/\s+/g, ' ').trim();
}

function publicUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

export function normalizeAmbassadors(payload, verifiedAt) {
  if (!Array.isArray(payload.items) || payload.items.length !== payload.metadata?.totalHits || !payload.items.length) {
    throw new Error('Incomplete AWS directory response; keeping the existing dataset.');
  }
  const records = payload.items.map(({ item, tags = [] }) => {
    const fields = item.additionalFields;
    const slug = item.id.split('#').at(-1);
    const title = plainText(fields.title || fields.heading);
    const parts = title.match(/^(.*?)\s*\((.+)\)\s*$/);
    const bio = plainText(fields.bodyBack);
    const countryTag = tags.find((tag) => /location/i.test(tag.tagNamespaceId) && COUNTRIES[tag.id.split('#').at(-1)]);
    const evidence = LOCATION_EVIDENCE[slug];
    const countryKey = countryTag?.id.split('#').at(-1) || (evidence && bio.includes(evidence[1]) ? evidence[0] : '');
    const [country = '', lat = 0, lng = 0] = COUNTRIES[countryKey] ?? [];
    const organization = parts?.[2] ?? '';
    const role = plainText(fields.body);
    return {
      id: `aws-ambassadors-${slug}`, name: parts?.[1] || title,
      avatarUrl: publicUrl(fields.mediaSrc),
      profileUrl: publicUrl(fields.primaryCTALink || fields.ctaLink) || SOURCE_URL,
      ctaLabel: publicUrl(fields.primaryCTALink || fields.ctaLink) ? 'View partner' : 'View AWS directory',
      organization, role, description: [role, organization].filter(Boolean).join(' · '),
      tag: tags.filter((tag) => tag.tagNamespaceId === 'GLOBAL#local-tags-partner-ambassadors').map((tag) => tag.name).join(', '),
      country, location: country, lat, lng,
      coordinatePrecision: country ? 'country' : null,
      locationSource: country ? countryTag ? 'directory-tag' : 'official-biography' : null,
      sourceUrl: SOURCE_URL, verifiedAt,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  if (new Set(records.map((record) => record.id)).size !== records.length || records.some((record) => !record.name)) {
    throw new Error('Invalid or duplicate Ambassador records; keeping the existing dataset.');
  }
  return records;
}

async function main() {
  const inputPath = process.argv[2];
  const payload = inputPath ? JSON.parse(await readFile(inputPath, 'utf8')) : await fetch(API_URL).then((response) => {
    if (!response.ok) throw new Error(`AWS directory returned ${response.status}`);
    return response.json();
  });
  const verifiedAt = new Date().toISOString().slice(0, 10);
  const records = normalizeAmbassadors(payload, verifiedAt);
  const tempUrl = new URL(`${DATA_URL.href}.tmp`);
  await writeFile(tempUrl, `${JSON.stringify(records, null, 2)}\n`);
  await rename(tempUrl, DATA_URL);
  console.log(`${records.length} Ambassadors; ${records.filter((r) => r.country).length} mapped across ${new Set(records.map((r) => r.country).filter(Boolean)).size} countries. Unlocated profiles remain in Directory and Gallery.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
