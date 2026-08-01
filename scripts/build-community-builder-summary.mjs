import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'community-builders.json');
const CLUSTERS_PATH = path.join(__dirname, '..', 'src', 'data', 'community-builders-clusters.json');
const META_PATH = path.join(__dirname, '..', 'src', 'data', 'community-builders-meta.json');

function getCountry(location) {
  const parts = String(location ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) || 'Unknown';
}

function clusterKey(builder) {
  const lat = Number(builder.lat) || 0;
  const lng = Number(builder.lng) || 0;
  return `${builder.location || 'Unknown'}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
}

const raw = JSON.parse(await readFile(INPUT_PATH, 'utf8'));
const clustersByKey = new Map();
const tags = new Set();
const countryCounts = new Map();

for (const builder of raw) {
  if (builder.tag) tags.add(builder.tag);

  const country = getCountry(builder.location);
  if (country !== 'Unknown') {
    countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
  }

  if (!Number.isFinite(builder.lat) || !Number.isFinite(builder.lng) || (builder.lat === 0 && builder.lng === 0)) {
    continue;
  }

  const key = clusterKey(builder);
  const existing = clustersByKey.get(key) ?? {
    id: `community-builders-cluster-${clustersByKey.size + 1}`,
    name: '',
    avatarUrl: '',
    profileUrl: '',
    location: builder.location || country,
    country,
    lat: builder.lat,
    lng: builder.lng,
    tag: 'All Builders',
    builderType: 'Community Builder Cluster',
    specialization: '',
    builderCount: 0,
    clusterOnly: true,
    sampleBuilders: [],
    ledBy: [],
  };

  existing.builderCount += 1;
  const previewBuilder = {
    name: builder.name,
    imageUrl: builder.avatarUrl || '',
    ...(builder.isNew ? { isNew: true } : {}),
  };

  if (builder.isNew) {
    existing.isNew = true;
    existing.newBuilderCount = (existing.newBuilderCount ?? 0) + 1;
    existing.newBuilders = [...(existing.newBuilders ?? []), previewBuilder];
    existing.sampleBuilders = [
      previewBuilder,
      ...existing.sampleBuilders.filter((sample) => sample.name !== builder.name),
    ].slice(0, 4);
  } else if (existing.sampleBuilders.length < 4) {
    existing.sampleBuilders.push(previewBuilder);
  }
  clustersByKey.set(key, existing);
}

const clusters = [...clustersByKey.values()]
  .map((cluster) => ({
    ...cluster,
    name: `${cluster.builderCount.toLocaleString('en-US')} Community Builders in ${cluster.location}`,
    ledBy: cluster.sampleBuilders,
  }))
  .sort((a, b) => b.builderCount - a.builderCount || a.location.localeCompare(b.location));

const countries = [...countryCounts.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([country]) => country);

const meta = {
  updatedAt: new Date().toISOString(),
  total: raw.length,
  mappedTotal: clusters.reduce((sum, cluster) => sum + cluster.builderCount, 0),
  newTotal: raw.filter((builder) => builder.isNew).length,
  tags: [...tags].sort(),
  countries,
  countryCounts: Object.fromEntries([...countryCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
};

await writeFile(CLUSTERS_PATH, `${JSON.stringify(clusters, null, 2)}\n`, 'utf8');
await writeFile(META_PATH, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

console.log(`Wrote ${clusters.length} Community Builder clusters`);
