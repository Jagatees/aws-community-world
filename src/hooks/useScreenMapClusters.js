import { useEffect, useState } from 'react';
import { clusterScreenLocations } from '../utils/screenMapClusters.js';

const HORIZON_CUTOFF = Math.cos(96 * Math.PI / 180);

function sameClusterMembership(previous, next) {
  return previous.length === next.length && previous.every((cluster, index) => {
    const candidate = next[index];
    return cluster.lat === candidate.lat && cluster.lng === candidate.lng
      && Boolean(cluster.isApproximate) === Boolean(candidate.isApproximate)
      && Boolean(cluster.forceSeparateMarker) === Boolean(candidate.forceSeparateMarker)
      && cluster.members.length === candidate.members.length
      && cluster.members.every((member, memberIndex) => member === candidate.members[memberIndex]);
  });
}

// Call after the map-creation effect. lifecycle must match that effect so map
// recreation (including theme/style changes) reattaches these subscriptions.
export function useScreenMapClusters(mapRef, lifecycle, locations, category, globe = false) {
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    let previousLevel;

    const update = () => {
      const currentZoom = map.getZoom();
      const zoom = Number.isFinite(currentZoom) ? currentZoom : 0;
      const level = Math.max(0, Math.floor(zoom));
      previousLevel = level;
      let next = locations;

      if (category !== 'community-days' && level < 12) {
        const scale = 2 ** (zoom - level);
        const center = globe ? map.getCenter() : null;
        const centerLatitude = center ? center.lat * Math.PI / 180 : 0;
        const project = ([lng, lat]) => {
          if (globe) {
            const latitude = lat * Math.PI / 180;
            const longitudeDelta = (lng - center.lng) * Math.PI / 180;
            const facing = Math.sin(latitude) * Math.sin(centerLatitude)
              + Math.cos(latitude) * Math.cos(centerLatitude) * Math.cos(longitudeDelta);
            // Keep hidden locations as separate source markers. Projected globe
            // positions on opposite hemispheres can otherwise overlap on screen.
            if (facing < HORIZON_CUTOFF) return null;
          }
          const point = map.project([lng, lat]);
          return point ? { x: point.x / scale, y: point.y / scale } : null;
        };
        next = clusterScreenLocations(locations, project, 48);
      }

      // Screen coordinates change during camera movement; marker renderers
      // project their anchors themselves. Only membership/source changes need
      // a new React cluster layer.
      setClusters(previous => sameClusterMembership(previous, next) ? previous : next);
    };
    const onZoom = () => {
      const zoom = map.getZoom();
      const level = Math.max(0, Math.floor(Number.isFinite(zoom) ? zoom : 0));
      if (level !== previousLevel) update();
    };

    update();
    map.on('zoom', onZoom);
    map.on('resize', update);
    map.on('style.load', update);
    // Pitch and bearing also change screen distances in country spotlights.
    map.on('moveend', update);
    return () => {
      map.off('zoom', onZoom);
      map.off('resize', update);
      map.off('style.load', update);
      map.off('moveend', update);
    };
  }, [mapRef, lifecycle, locations, category, globe]);

  return category === 'community-days' ? locations : clusters;
}
