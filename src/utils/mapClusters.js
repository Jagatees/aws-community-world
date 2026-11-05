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

export function createAreaClusterElement(cluster, { color, darkMode, onClick }) {
  const count = getRepresentedMemberCount(cluster.members);
  const groups = cluster.members.every(member => ['cloud-clubs', 'user-groups'].includes(member.category));
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.mapCluster = 'area';
  button.textContent = String(count);
  button.setAttribute('aria-label', `${count} ${groups ? 'groups' : 'members'} in this area. Zoom in to explore.`);
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
