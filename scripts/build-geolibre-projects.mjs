import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_DIR = path.join(ROOT, 'public', 'geolibre');
const MARKER_CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'geolibre-markers');
const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const MARKER_SIZE = 64;
const IMAGE_CONCURRENCY = 24;
const KML_ICON_PROPERTY = '__geolibre_kml_icon_url';

const CONFIG = [
  { id: 'heroes', source: 'heroes.json', name: 'AWS Heroes', color: '#ff9900' },
  { id: 'community-builders', source: 'community-builders.json', name: 'AWS Community Builders', color: '#1a9c3e' },
  { id: 'user-groups', source: 'user-groups.json', name: 'AWS User Groups', color: '#00a1c9' },
  { id: 'cloud-clubs', source: 'cloud-clubs.json', name: 'AWS Student Builder Groups', color: '#bf0816' },
  { id: 'kiro-ambassadors', source: 'kiro-ambassadors.json', name: 'Kiro Ambassadors', color: '#8b5cf6' },
  { id: 'kiro-events', source: 'kiro-events.json', name: 'Kiro Events', color: '#7b61ff' },
  { id: 'community-days', source: 'community-days.json', name: 'AWS Community Days', color: '#ff9900' },
  { id: 'news', source: 'news.json', name: 'AWS Community News', color: '#ff9900' },
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function recordsFor(config) {
  const data = readJson(config.source);
  if (config.id !== 'news') return data;
  const unique = new Map();
  [...(data.latest || []), ...(data.trending || [])].forEach((item) => unique.set(item.id, item));
  return [...unique.values()];
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function markerLabel(item) {
  const source = item.name || item.authorName || item.title || item.location || 'AWS';
  const words = String(source).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'AWS';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function avatarUrlFor(item) {
  const url = item.avatarUrl
    || item.image_url
    || item.authorAvatarUrl
    || item.imageUrl
    || item.photoUrl
    || item.image
    || '';
  return typeof url === 'string' && !url.includes('/assets/default-avatar-') ? url.trim() : '';
}

function resolveLocalImage(url) {
  if (!url.startsWith('/')) return null;
  const localPath = path.resolve(ROOT, 'public', url.slice(1));
  const publicRoot = path.resolve(ROOT, 'public');
  return localPath.startsWith(`${publicRoot}${path.sep}`) && fs.existsSync(localPath) ? localPath : null;
}

async function fetchImage(url) {
  const localPath = resolveLocalImage(url);
  if (localPath) return fs.readFileSync(localPath);
  if (!/^https?:\/\//i.test(url)) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
    } catch {
      // Retry once, then use the deterministic initials marker below.
    }
  }
  return null;
}

function borderSvg(color) {
  return Buffer.from(`<svg width="${MARKER_SIZE}" height="${MARKER_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="none" stroke="#ffffff" stroke-width="4"/>
    <circle cx="32" cy="32" r="27" fill="none" stroke="${escapeXml(color)}" stroke-width="3"/>
  </svg>`);
}

async function portraitMarker(image, color) {
  const faceSize = 52;
  const mask = Buffer.from(`<svg width="${faceSize}" height="${faceSize}" xmlns="http://www.w3.org/2000/svg"><circle cx="26" cy="26" r="26" fill="#fff"/></svg>`);
  const face = await sharp(image)
    .rotate()
    .resize(faceSize, faceSize, { fit: 'cover', position: 'attention' })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp({
    create: { width: MARKER_SIZE, height: MARKER_SIZE, channels: 4, background: '#00000000' },
  })
    .composite([
      { input: face, left: 6, top: 6 },
      { input: borderSvg(color), left: 0, top: 0 },
    ])
    .webp({ quality: 76, alphaQuality: 90 })
    .toBuffer();
}

async function badgeMarker(item, color) {
  const label = escapeXml(markerLabel(item));
  const fontSize = label.length > 2 ? 18 : 22;
  const svg = Buffer.from(`<svg width="${MARKER_SIZE}" height="${MARKER_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="#ffffff"/>
    <circle cx="32" cy="32" r="27" fill="${escapeXml(color)}"/>
    <text x="32" y="33" text-anchor="middle" dominant-baseline="middle" fill="#0f1923" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800">${label}</text>
  </svg>`);
  return sharp(svg).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
}

async function markerDataUrl(item, color) {
  const avatarUrl = avatarUrlFor(item);
  const cacheKey = createHash('sha1')
    .update(`${avatarUrl || `badge:${markerLabel(item)}`}\0${color}\0${MARKER_SIZE}`)
    .digest('hex');
  const cachePath = path.join(MARKER_CACHE_DIR, `${cacheKey}.webp`);
  if (fs.existsSync(cachePath)) {
    return `data:image/webp;base64,${fs.readFileSync(cachePath).toString('base64')}`;
  }

  let marker = null;
  if (avatarUrl) {
    const image = await fetchImage(avatarUrl);
    if (image) {
      try {
        marker = await portraitMarker(image, color);
      } catch {
        marker = null;
      }
    }
  }
  marker ||= await badgeMarker(item, color);
  fs.writeFileSync(cachePath, marker);
  return `data:image/webp;base64,${marker.toString('base64')}`;
}

function detailsHtml(item, category, location, profileUrl) {
  const rows = [category, location].filter(Boolean).map(escapeXml);
  const link = /^https?:\/\//i.test(profileUrl)
    ? `<a href="${escapeXml(profileUrl)}" target="_blank">Open profile</a>`
    : '';
  return [...rows, link].filter(Boolean).join('<br>');
}

async function toFeature(item, index, config) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = item.name || item.title || item.location || `Location ${index + 1}`;
  const location = item.location || item.country || '';
  const category = item.tag || item.hero_type || item.eventStatus || item.tags?.[0] || config.name;
  const profileUrl = item.profileUrl || item.hero_page_url || item.joinUrl || item.url || '';
  const marker = await markerDataUrl(item, config.color);
  const socialLinks = item.socialLinks && typeof item.socialLinks === 'object' ? item.socialLinks : {};

  return {
    type: 'Feature',
    id: item.id || `${index}`,
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      name,
      timestamp: [category, location].filter(Boolean).join(' · '),
      location,
      category,
      ...(item.description ? { summary: item.description } : {}),
      ...(item.eventDate || item.date ? { date: item.eventDate || item.date } : {}),
      ...(item.authorName ? { author: item.authorName } : {}),
      ...(profileUrl ? { profileUrl } : {}),
      ...(item.builderProfileUrl ? { builderProfileUrl: item.builderProfileUrl } : {}),
      ...Object.fromEntries(Object.entries(socialLinks).filter(([, value]) => value)),
      description: detailsHtml(item, category, location, profileUrl),
      markerColor: config.color,
      photo: marker,
      [KML_ICON_PROPERTY]: marker,
    },
  };
}

async function mapWithConcurrency(items, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(IMAGE_CONCURRENCY, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return output;
}

async function createProject(config) {
  const records = recordsFor(config);
  const features = (await mapWithConcurrency(records, (item, index) => toFeature(item, index, config)))
    .filter(Boolean);
  const style = {
    minZoom: 0,
    maxZoom: 24,
    fillColor: config.color,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    strokeWidthUnit: 'pixels',
    fillOpacity: 0.92,
    circleRadius: 6,
  };

  return {
    version: '0.1.0',
    name: config.name,
    mapView: { center: [15, 18], zoom: 1.25, bearing: 0, pitch: 22 },
    basemapStyleUrl: BASEMAP,
    basemapVisible: true,
    basemapOpacity: 1,
    layers: [{
      id: config.id,
      name: config.name,
      type: 'geojson',
      source: { type: 'geojson' },
      visible: true,
      opacity: 1,
      style,
      metadata: {
        sourceKind: 'geotagged-photos',
        featureCount: features.length,
      },
      geojson: { type: 'FeatureCollection', features },
    }],
    styles: { [config.id]: style },
    preferences: {
      map: {
        restrictBounds: false,
        bounds: [-180, -85, 180, 85],
        minZoom: 0,
        maxZoom: 24,
        maxPitch: 85,
        renderWorldCopies: true,
        projection: 'globe',
        ellipsoidId: 'earth',
        scaleUnit: 'metric'
      },
      environmentVariables: [],
      geocoding: { providerId: 'nominatim', apiKeys: {} }
    },
    metadata: { source: 'AWS Community World' },
  };
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(MARKER_CACHE_DIR, { recursive: true });
for (const config of CONFIG) {
  const project = await createProject(config);
  const output = path.join(OUTPUT_DIR, `${config.id}.geolibre.json`);
  fs.writeFileSync(output, `${JSON.stringify(project)}\n`);
  console.log(`${config.name}: ${project.layers[0].geojson.features.length} locations`);
}
