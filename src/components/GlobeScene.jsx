import { useEffect, useMemo, useRef } from 'react';
import createGlobe from 'cobe';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'news': '#FF9900',
};

const CLUSTER_TOLERANCE = 0.5;
const AUTO_ROTATE_SPEED = 0.003;
const DRAG_SENSITIVITY = 0.005;
const MAX_TILT = Math.PI / 3;
const IDLE_TIMEOUT_MS = 3000;
const SINGLE_MARKER_SIZE = 0.02;
const CLUSTER_MARKER_BASE_SIZE = 0.028;
const CLUSTER_MARKER_STEP = 0.004;
const CLUSTER_MARKER_MAX_SIZE = 0.042;
const BASE_SCALE = 0.95;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.85;
const WHEEL_ZOOM_SENSITIVITY = 0.0009;

function clusterMembers(members) {
  const clusters = [];
  for (const member of members) {
    const existing = clusters.find(
      (c) =>
        Math.abs(c.lat - member.lat) <= CLUSTER_TOLERANCE &&
        Math.abs(c.lng - member.lng) <= CLUSTER_TOLERANCE
    );
    if (existing) {
      existing.members.push(member);
    } else {
      clusters.push({ lat: member.lat, lng: member.lng, members: [member] });
    }
  }
  return clusters;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  let next = ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (next === -Math.PI) next = Math.PI;
  return next;
}

function getResponsiveScale(scale, width, height) {
  const aspectRatio = width / Math.max(height, 1);
  const landscapeFactor =
    aspectRatio > 1.45
      ? Math.max(0.72, 1 - (aspectRatio - 1.45) * 0.16)
      : 1;

  return scale * landscapeFactor;
}

function hexToRgb01(hex) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function latLngToVector(lat, lng) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRad);

  return {
    x: -cosLat * Math.cos(lngRad),
    y: Math.sin(latRad),
    z: cosLat * Math.sin(lngRad),
  };
}

function getCameraSpacePosition(lat, lng, phi, theta) {
  const point = latLngToVector(lat, lng);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  return {
    x: point.x * cosPhi + point.z * sinPhi,
    y: point.x * sinPhi * sinTheta + point.y * cosTheta - point.z * cosPhi * sinTheta,
    z: -point.x * sinPhi * cosTheta + point.y * sinTheta + point.z * cosPhi * cosTheta,
  };
}

function getRotationForLocation(lat, lng) {
  const point = latLngToVector(lat, lng);
  const horizontalRadius = Math.hypot(point.x, point.z);

  return {
    phi: Math.atan2(-point.x, point.z),
    theta: Math.atan2(point.y, horizontalRadius),
  };
}

function projectMarker(cluster, phi, theta, width, height, scale) {
  const cameraPoint = getCameraSpacePosition(cluster.lat, cluster.lng, phi, theta);
  if (cameraPoint.z <= 0) return null;

  const radiusBase = Math.min(width, height) / 2;
  const aspect = width / height;
  const ndcX = (0.8 * cameraPoint.x * scale) / aspect;
  const ndcY = 0.8 * cameraPoint.y * scale;

  return {
    ...cluster,
    x: ((ndcX + 1) / 2) * width,
    y: ((1 - ndcY) / 2) * height,
    z: cameraPoint.z,
    radius: Math.max(10, cluster.size * radiusBase * 1.4),
  };
}

export default function GlobeScene({ category, members, onMarkerClick, cardOpen, darkMode, flyToTarget, zoomCommand }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  const scaleRef = useRef(BASE_SCALE);
  const animationRef = useRef(null);
  const projectedMarkersRef = useRef([]);
  const clustersRef = useRef([]);
  const themeRef = useRef({ darkMode: true, markerRgb: [1, 0.6, 0] });
  const idleTimerRef = useRef(null);
  const autoRotateEnabledRef = useRef(true);
  const markerFocusLockedRef = useRef(false);
  const isHoveringMarkerRef = useRef(false);
  const pauseRotationRef = useRef(cardOpen);
  const pointerStateRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startPhi: 0,
    startTheta: 0,
  });

  const markerColor = CATEGORY_COLORS[category] ?? '#FF9900';
  const markerRgb = useMemo(() => hexToRgb01(markerColor), [markerColor]);

  const clusters = useMemo(
    () =>
      clusterMembers(members).map((cluster) => ({
        ...cluster,
        location: [cluster.lat, cluster.lng],
        size:
          cluster.members.length > 1
            ? Math.min(
              CLUSTER_MARKER_BASE_SIZE + Math.sqrt(cluster.members.length - 1) * CLUSTER_MARKER_STEP,
              CLUSTER_MARKER_MAX_SIZE
            )
            : SINGLE_MARKER_SIZE,
        color: markerRgb,
      })),
    [members, markerRgb]
  );

  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    themeRef.current = { darkMode, markerRgb };
  }, [darkMode, markerRgb]);

  useEffect(() => {
    pauseRotationRef.current = cardOpen;
    if (!cardOpen) {
      markerFocusLockedRef.current = false;
    }
  }, [cardOpen]);

  useEffect(() => {
    if (!flyToTarget) return;
    const target = getRotationForLocation(flyToTarget.lat, flyToTarget.lng);
    animationRef.current = {
      startTime: performance.now(),
      duration: 1000,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
      targetPhi: phiRef.current + normalizeAngle(target.phi - phiRef.current),
      targetTheta: clamp(target.theta, -MAX_TILT, MAX_TILT),
    };
  }, [flyToTarget]);

  useEffect(() => {
    if (!zoomCommand?.direction) return;

    if (zoomCommand.direction === 'in') {
      scaleRef.current = clamp(scaleRef.current * 1.14, MIN_SCALE, MAX_SCALE);
    } else if (zoomCommand.direction === 'out') {
      scaleRef.current = clamp(scaleRef.current / 1.14, MIN_SCALE, MAX_SCALE);
    }

    autoRotateEnabledRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, [zoomCommand]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(containerRef.current.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(containerRef.current.clientHeight * pixelRatio));
      sizeRef.current = { width, height };
    };

    updateSize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: themeRef.current.darkMode ? 1 : 0,
      diffuse: themeRef.current.darkMode ? 1.1 : 1.35,
      mapSamples: 16000,
      mapBrightness: themeRef.current.darkMode ? 5 : 6,
      mapBaseBrightness: themeRef.current.darkMode ? 0.05 : 0.18,
      baseColor: themeRef.current.darkMode ? [0.06, 0.1, 0.16] : [0.33, 0.42, 0.5],
      markerColor: themeRef.current.markerRgb,
      glowColor: themeRef.current.darkMode ? [0.29, 0.56, 0.85] : [0.67, 0.82, 0.94],
      scale: getResponsiveScale(scaleRef.current, sizeRef.current.width, sizeRef.current.height),
      offset: [0, 0],
      markers: clustersRef.current,
      opacity: 1,
      onRender: (state) => {
        const currentClusters = clustersRef.current;
        const theme = themeRef.current;

        if (animationRef.current) {
          const elapsed = performance.now() - animationRef.current.startTime;
          const progress = clamp(elapsed / animationRef.current.duration, 0, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          phiRef.current = animationRef.current.startPhi + (animationRef.current.targetPhi - animationRef.current.startPhi) * eased;
          thetaRef.current = animationRef.current.startTheta + (animationRef.current.targetTheta - animationRef.current.startTheta) * eased;
          if (progress === 1) animationRef.current = null;
        } else if (
          autoRotateEnabledRef.current &&
          !pauseRotationRef.current &&
          !markerFocusLockedRef.current &&
          !pointerStateRef.current.active
        ) {
          phiRef.current += AUTO_ROTATE_SPEED;
        }

        state.width = sizeRef.current.width;
        state.height = sizeRef.current.height;
        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.dark = theme.darkMode ? 1 : 0;
        state.diffuse = theme.darkMode ? 1.1 : 1.35;
        state.mapBrightness = theme.darkMode ? 5 : 6;
        state.mapBaseBrightness = theme.darkMode ? 0.05 : 0.18;
        state.baseColor = theme.darkMode ? [0.06, 0.1, 0.16] : [0.33, 0.42, 0.5];
        state.scale = getResponsiveScale(scaleRef.current, sizeRef.current.width, sizeRef.current.height);
        state.markerColor = theme.markerRgb;
        state.glowColor = theme.darkMode ? [0.29, 0.56, 0.85] : [0.67, 0.82, 0.94];
        state.markers = currentClusters;

        projectedMarkersRef.current = currentClusters
          .map((cluster) =>
            projectMarker(
              cluster,
              phiRef.current,
              thetaRef.current,
              sizeRef.current.width,
              sizeRef.current.height,
              getResponsiveScale(scaleRef.current, sizeRef.current.width, sizeRef.current.height)
            )
          )
          .filter(Boolean)
          .sort((a, b) => b.z - a.z);
      },
    });

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      globe.destroy();
    };
  }, []);

  function markActiveInteraction() {
    autoRotateEnabledRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!markerFocusLockedRef.current && !pauseRotationRef.current) {
        autoRotateEnabledRef.current = true;
      }
    }, IDLE_TIMEOUT_MS);
  }

  function animateToLocation(lat, lng, duration = 800) {
    const target = getRotationForLocation(lat, lng);
    animationRef.current = {
      startTime: performance.now(),
      duration,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
      targetPhi: phiRef.current + normalizeAngle(target.phi - phiRef.current),
      targetTheta: clamp(target.theta, -MAX_TILT, MAX_TILT),
    };
  }

  function findHitMarker(event) {
    if (!canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const x = (event.clientX - rect.left) * pixelRatio;
    const y = (event.clientY - rect.top) * pixelRatio;

    return projectedMarkersRef.current.find((marker) => {
      const dx = marker.x - x;
      const dy = marker.y - y;
      return dx * dx + dy * dy <= marker.radius * marker.radius;
    });
  }

  function handlePointerDown(event) {
    pointerStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
    };
    animationRef.current = null;
    markActiveInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const hitMarker = findHitMarker(event);
    isHoveringMarkerRef.current = !!hitMarker;
    event.currentTarget.style.cursor = pointerStateRef.current.active
      ? 'grabbing'
      : hitMarker
        ? 'pointer'
        : 'grab';

    if (!pointerStateRef.current.active || pointerStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - pointerStateRef.current.startX;
    const deltaY = event.clientY - pointerStateRef.current.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      pointerStateRef.current.moved = true;
    }

    phiRef.current = pointerStateRef.current.startPhi + deltaX * DRAG_SENSITIVITY;
    thetaRef.current = clamp(pointerStateRef.current.startTheta + deltaY * DRAG_SENSITIVITY, -MAX_TILT, MAX_TILT);
    markActiveInteraction();
  }

  function handleWheel(event) {
    event.preventDefault();
    scaleRef.current = clamp(scaleRef.current - event.deltaY * WHEEL_ZOOM_SENSITIVITY, MIN_SCALE, MAX_SCALE);
    markActiveInteraction();
  }

  function finishPointerInteraction(event, { allowClick }) {
    if (pointerStateRef.current.pointerId !== event.pointerId) return;

    const wasDrag = pointerStateRef.current.moved;
    pointerStateRef.current.active = false;
    pointerStateRef.current.pointerId = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!allowClick || wasDrag) return;

    const hitMarker = findHitMarker(event);
    if (!hitMarker) return;

    markerFocusLockedRef.current = true;
    autoRotateEnabledRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    animateToLocation(hitMarker.lat, hitMarker.lng);
    const payload = hitMarker.members.length === 1 ? hitMarker.members[0] : hitMarker.members;
    onMarkerClick(payload);
  }

  function handlePointerUp(event) {
    finishPointerInteraction(event, { allowClick: true });
    event.currentTarget.style.cursor = isHoveringMarkerRef.current ? 'pointer' : 'grab';
  }

  function handlePointerCancel(event) {
    finishPointerInteraction(event, { allowClick: false });
    isHoveringMarkerRef.current = false;
    event.currentTarget.style.cursor = 'grab';
  }

  function handlePointerLeave(event) {
    if (pointerStateRef.current.active) return;
    isHoveringMarkerRef.current = false;
    event.currentTarget.style.cursor = 'grab';
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}
    >
      <div className="aws-globe-pattern" />
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full"
        style={{ touchAction: 'none', cursor: 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}
