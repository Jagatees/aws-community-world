import { useEffect, useState } from 'react';
import { getMapClusterStep } from '../utils/mapClusters.js';

// lifecycle must match the owning map's creation effect so style changes also
// reattach zoom listeners. Call this hook after the map creation effect.
export function useMapClusterStep(mapRef, lifecycle) {
  const [step, setStep] = useState(() => getMapClusterStep(0));
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const update = () => setStep(getMapClusterStep(map.getZoom()));
    update();
    map.on('zoom', update);
    return () => map.off('zoom', update);
  }, [mapRef, lifecycle]);
  return step;
}
