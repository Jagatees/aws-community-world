import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_DIR = path.join(ROOT, 'public', 'geolibre');
const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

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

function toFeature(item, index, color) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    type: 'Feature',
    id: item.id || `${index}`,
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      name: item.name || item.title || item.location || `Location ${index + 1}`,
      location: item.location || item.country || '',
      category: item.tag || item.hero_type || item.eventStatus || item.tags?.[0] || '',
      profileUrl: item.profileUrl || item.hero_page_url || item.joinUrl || item.url || '',
      markerColor: color,
    },
  };
}

function createProject(config) {
  const features = recordsFor(config)
    .map((item, index) => toFeature(item, index, config.color))
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
      metadata: {},
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
for (const config of CONFIG) {
  const project = createProject(config);
  const output = path.join(OUTPUT_DIR, `${config.id}.geolibre.json`);
  fs.writeFileSync(output, `${JSON.stringify(project)}\n`);
  console.log(`${config.name}: ${project.layers[0].geojson.features.length} locations`);
}
