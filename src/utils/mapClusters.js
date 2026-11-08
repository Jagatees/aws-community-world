import { groupGlobeLocations } from './globeClusters.js';
import { getRepresentedMemberCount } from './memberCounts.js';

// Roughly 64 screen pixels at the equator. Rebuild only at integer zoom
// boundaries, not on every animation frame. At campus zoom use source locations.
export function getMapClusterStep(zoom) {
  const level = Math.max(0, Math.floor(Number.isFinite(zoom) ? zoom : 0));
  return level >= 12 ? 0 : 45 / (2 ** level);
}

export function clusterMapLocations(locations, cellDegrees, category) {
  // Event markers have their own expansion/countdown behavior.
  if (category === 'community-days') return locations;
  return groupGlobeLocations(locations, cellDegrees);
}

export function zoomToMapCluster(map, cluster) {
  const coordinates = cluster.members.filter(member => Number.isFinite(member.lat)
    && Math.abs(member.lat) <= 90 && Number.isFinite(member.lng));
  if (coordinates.length === 0) return;

  // Excluding the largest gap gives the shortest longitude interval, including
  // groups spanning 180/-180. Shift it to the world nearest the current camera.
  const longitudes = [...new Set(coordinates.map(member => ((member.lng + 180) % 360 + 360) % 360 - 180))].sort((a, b) => a - b);
  let largestGap = -1;
  let west = longitudes[0];
  for (let index = 0; index < longitudes.length; index += 1) {
    const next = longitudes[(index + 1) % longitudes.length];
    const gap = index === longitudes.length - 1 ? next + 360 - longitudes[index] : next - longitudes[index];
    if (gap > largestGap) {
      largestGap = gap;
      west = next;
    }
  }
  let east = west + 360 - largestGap;
  const cameraLongitude = map.getCenter().lng;
  const shift = 360 * Math.round((cameraLongitude - (west + east) / 2) / 360);
  west += shift;
  east += shift;
  const latitudes = coordinates.map(member => member.lat);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);

  if (west === east && south === north) {
    map.easeTo({ center: [west, south], zoom: Math.min(12, Math.floor(map.getZoom()) + 2), duration: 650 });
    return;
  }

  const canvas = map.getCanvas();
  const padding = Math.min(64, Math.max(24, Math.round(Math.min(canvas.clientWidth, canvas.clientHeight) * 0.18)));
  map.fitBounds([[west, south], [east, north]], { padding, duration: 650, maxZoom: 12 });
}

export function createAreaClusterElement(cluster, { color, darkMode, onClick }) {
  const count = getRepresentedMemberCount(cluster.members);
  const groups = cluster.members.every(member => ['cloud-clubs', 'user-groups'].includes(member.category));
  const events = cluster.members.every(member => ['community-days', 'kiro-events', 'builder-events', 'events'].includes(member.category));
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.mapCluster = 'area';
  button.textContent = String(count);
  button.setAttribute('aria-label', `${count} ${groups ? 'groups' : events ? 'events' : 'members'} in this area. Zoom in to explore.`);
  Object.assign(button.style, {
    position: 'absolute', left: '0', top: '0', minWidth: '44px', height: '44px',
    padding: '0 9px', borderRadius: '999px', background: color, color: '#FFFFFF',
    border: `2px solid ${darkMode ? '#FFFFFF' : '#0F1923'}`,
    font: '800 13px system-ui, sans-serif', cursor: 'pointer', pointerEvents: 'auto',
    transform: 'translate(-50%, -50%)',
  });
  button.onpointerdown = event => event.stopPropagation();
  button.onpointerup = event => event.stopPropagation();
  button.onclick = event => { event.stopPropagation(); onClick(); };
  return button;
}
