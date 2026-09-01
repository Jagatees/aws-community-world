import { useEffect, useMemo, useRef } from 'react';
import createGlobe from 'cobe';
import { countryCodeToFlag, getCountryCode } from '../utils/countryFlags';
import { getMemberCountry } from '../utils/memberMarkers';
import { clusterMembersByCoordinates } from '../utils/mapCoordinates';
import './GlobeScene.css';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
  'kiro-ambassadors': '#8B5CF6',
  'kiro-events': '#7B61FF',
  'community-days': '#FF9900',
  'aws-ambassadors': '#2D72D2',
  'news': '#FF9900',
};

const AUTO_ROTATE_RADIANS_PER_SECOND = 0.045;
const DRAG_SENSITIVITY = 0.005;
const MAX_TILT = Math.PI / 3;
const IDLE_TIMEOUT_MS = 3000;
const SINGLE_MARKER_SIZE = 0.028;
const CLUSTER_MARKER_BASE_SIZE = 0.038;
const CLUSTER_MARKER_STEP = 0.006;
const CLUSTER_MARKER_MAX_SIZE = 0.06;
const BASE_SCALE = 0.95;
const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
const WHEEL_ZOOM_SENSITIVITY = 0.0009;
const PINCH_MIN_DISTANCE = 24;
const LABEL_FOCUS_START = 0.34;
const LABEL_FOCUS_FULL = 0.62;
const LABEL_COLLISION_PADDING = 5;
const MAX_DESKTOP_LABELS = 18;
const MAX_MOBILE_LABELS = 8;
const LABEL_POOL_SIZE = MAX_DESKTOP_LABELS;
const MOBILE_MAX_PIXEL_RATIO = 1.5;
const DESKTOP_MAX_PIXEL_RATIO = 2;
const MOBILE_MAP_SAMPLES = 10000;
const DESKTOP_MAP_SAMPLES = 16000;

const CATEGORY_LABELS = {
  'heroes': { icon: '✦', singular: 'Hero', plural: 'Heroes' },
  'community-builders': { icon: '◆', singular: 'Community Builder', plural: 'Community Builders' },
  'user-groups': { icon: '●', singular: 'User Group', plural: 'User Groups' },
  'cloud-clubs': { icon: '☁', singular: 'Student Builder Group', plural: 'Student Builder Groups' },
  'kiro-ambassadors': { icon: '◇', singular: 'Kiro Ambassador', plural: 'Kiro Ambassadors' },
  'kiro-events': { icon: '◆', singular: 'Kiro Event', plural: 'Kiro Events' },
  'community-days': { icon: '▣', singular: 'Community Day', plural: 'Community Days' },
  'aws-ambassadors': { icon: '▲', singular: 'AWS Ambassador', plural: 'AWS Ambassadors' },
  'news': { icon: '↗', singular: 'Story', plural: 'Stories' },
};

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

function getRendererProfile(container) {
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isMobile = container.clientWidth < 768
    || (isCoarsePointer && container.clientWidth < 1024);

  return {
    isMobile,
    pixelRatio: Math.min(
      window.devicePixelRatio || 1,
      isMobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO
    ),
    mapSamples: isMobile ? MOBILE_MAP_SAMPLES : DESKTOP_MAP_SAMPLES,
  };
}

function getPointerDistance(pointers) {
  if (pointers.length < 2) return 0;
  return Math.hypot(pointers[0].clientX - pointers[1].clientX, pointers[0].clientY - pointers[1].clientY);
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
    radius: Math.max(14, cluster.size * radiusBase * 1.9),
  };
}

function drawMarkers(canvas, markers, markerRgb, pixelRatio) {
  const context = canvas?.getContext('2d');
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  const [red, green, blue] = markerRgb.map((channel) => Math.round(channel * 255));
  const color = `${red}, ${green}, ${blue}`;

  for (const marker of [...markers].sort((a, b) => a.z - b.z)) {
    const clusterScale = marker.size / SINGLE_MARKER_SIZE;
    const radius = clamp(7 * clusterScale, 7, 13) * pixelRatio;
    const edgeFade = clamp(marker.z / 0.16, 0, 1);
    if (edgeFade <= 0) continue;

    const halo = context.createRadialGradient(
      marker.x,
      marker.y,
      radius * 0.45,
      marker.x,
      marker.y,
      radius * 1.65
    );
    halo.addColorStop(0, `rgba(${color}, ${0.2 * edgeFade})`);
    halo.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = halo;
    context.beginPath();
    context.arc(marker.x, marker.y, radius * 1.65, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(${color}, ${0.98 * edgeFade})`;
    context.beginPath();
    context.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(255, 255, 255, ${0.16 * edgeFade})`;
    context.lineWidth = Math.max(1, pixelRatio * 0.75);
    context.stroke();
  }
}

function getClusterLabel(cluster, category) {
  const categoryLabel = CATEGORY_LABELS[category] ?? { icon: '●', singular: 'Member', plural: 'Members' };
  const count = cluster.members.length;
  const countries = cluster.members
    .map((member) => getMemberCountry(member))
    .filter(Boolean);
  const countryCodes = [...new Set(countries.map((country) => getCountryCode(country)).filter(Boolean))];
  const country = countryCodes.length === 1
    ? countries.find((value) => getCountryCode(value) === countryCodes[0]) || ''
    : '';

  return {
    icon: categoryLabel.icon,
    country,
    flag: countryCodes.length === 1 ? countryCodeToFlag(countryCodes[0]) : '',
    text: count > 1
      ? `${count} ${categoryLabel.plural} here`
      : cluster.members[0]?.name || categoryLabel.singular,
  };
}

function rectanglesOverlap(first, second) {
  return !(
    first.right + LABEL_COLLISION_PADDING < second.left ||
    first.left > second.right + LABEL_COLLISION_PADDING ||
    first.bottom + LABEL_COLLISION_PADDING < second.top ||
    first.top > second.bottom + LABEL_COLLISION_PADDING
  );
}

export default function GlobeScene({ category, members, onMarkerClick, cardOpen, darkMode, flyToTarget, zoomCommand }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const markerCanvasRef = useRef(null);
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
    mode: 'drag',
    startX: 0,
    startY: 0,
    startPhi: 0,
    startTheta: 0,
    startDistance: 0,
    startScale: BASE_SCALE,
  });
  const activePointersRef = useRef(new Map());
  const labelElementsRef = useRef([]);
  const assignedLabelClustersRef = useRef([]);
  const pixelRatioRef = useRef(1);
  const prefersReducedMotionRef = useRef(false);
  const lastRenderTimeRef = useRef(null);

  const markerColor = CATEGORY_COLORS[category] ?? '#FF9900';
  const markerRgb = useMemo(() => hexToRgb01(markerColor), [markerColor]);

  const clusters = useMemo(
    () =>
      clusterMembersByCoordinates(members).map((cluster, index) => ({
        ...cluster,
        key: `${cluster.members[0]?.id ?? cluster.members[0]?.name ?? 'marker'}-${cluster.lat}-${cluster.lng}-${index}`,
        location: [cluster.lat, cluster.lng],
        size:
          cluster.members.length > 1
            ? Math.min(
              CLUSTER_MARKER_BASE_SIZE + Math.sqrt(cluster.members.length - 1) * CLUSTER_MARKER_STEP,
              CLUSTER_MARKER_MAX_SIZE
            )
            : SINGLE_MARKER_SIZE,
        color: markerRgb,
        label: getClusterLabel(cluster, category),
      })),
    [category, members, markerRgb]
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
      startTime: null,
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

    const rendererProfile = getRendererProfile(containerRef.current);
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    pixelRatioRef.current = rendererProfile.pixelRatio;
    prefersReducedMotionRef.current = reducedMotionQuery.matches;
    if (reducedMotionQuery.matches) autoRotateEnabledRef.current = false;

    const updateSize = () => {
      if (!containerRef.current) return;
      const pixelRatio = pixelRatioRef.current;
      const width = Math.max(1, Math.round(containerRef.current.clientWidth * pixelRatio));
      const height = Math.max(1, Math.round(containerRef.current.clientHeight * pixelRatio));
      sizeRef.current = { width, height };
      if (markerCanvasRef.current) {
        markerCanvasRef.current.width = width;
        markerCanvasRef.current.height = height;
      }
    };

    updateSize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: rendererProfile.pixelRatio,
      width: sizeRef.current.width,
      height: sizeRef.current.height,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: themeRef.current.darkMode ? 1 : 0,
      diffuse: themeRef.current.darkMode ? 1.1 : 1.35,
      mapSamples: rendererProfile.mapSamples,
      mapBrightness: themeRef.current.darkMode ? 5 : 6,
      mapBaseBrightness: themeRef.current.darkMode ? 0.05 : 0.18,
      baseColor: themeRef.current.darkMode ? [0.06, 0.1, 0.16] : [0.33, 0.42, 0.5],
      markerColor: themeRef.current.markerRgb,
      glowColor: themeRef.current.darkMode ? [0.29, 0.56, 0.85] : [0.67, 0.82, 0.94],
      scale: getResponsiveScale(scaleRef.current, sizeRef.current.width, sizeRef.current.height),
      offset: [0, 0],
      markers: [],
      opacity: 1,
      onRender: (state) => {
        const currentClusters = clustersRef.current;
        const theme = themeRef.current;
        const renderTime = performance.now();
        const elapsedSeconds = lastRenderTimeRef.current === null
          ? 0
          : Math.min((renderTime - lastRenderTimeRef.current) / 1000, 0.05);
        lastRenderTimeRef.current = renderTime;

        if (animationRef.current) {
          if (animationRef.current.startTime === null) {
            animationRef.current.startTime = renderTime;
          }
          const elapsed = renderTime - animationRef.current.startTime;
          const progress = clamp(elapsed / animationRef.current.duration, 0, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          phiRef.current = animationRef.current.startPhi + (animationRef.current.targetPhi - animationRef.current.startPhi) * eased;
          thetaRef.current = animationRef.current.startTheta + (animationRef.current.targetTheta - animationRef.current.startTheta) * eased;
          if (progress === 1) animationRef.current = null;
        } else if (
          autoRotateEnabledRef.current &&
          !prefersReducedMotionRef.current &&
          !pauseRotationRef.current &&
          !markerFocusLockedRef.current &&
          !pointerStateRef.current.active
        ) {
          phiRef.current += AUTO_ROTATE_RADIANS_PER_SECOND * elapsedSeconds;
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
        state.markers = [];

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

        drawMarkers(
          markerCanvasRef.current,
          projectedMarkersRef.current,
          theme.markerRgb,
          pixelRatioRef.current
        );

        const pixelRatio = pixelRatioRef.current;
        const maxVisibleLabels = rendererProfile.isMobile ? MAX_MOBILE_LABELS : MAX_DESKTOP_LABELS;
        const occupiedRectangles = [];
        let nextPoolIndex = 0;
        const labelCandidates = projectedMarkersRef.current
          .filter((marker) => marker.z >= LABEL_FOCUS_START)
          .sort((first, second) => {
            const clusterPriority = second.members.length - first.members.length;
            return clusterPriority || second.z - first.z;
          });

        for (const marker of labelCandidates) {
          if (nextPoolIndex >= maxVisibleLabels) break;

          const x = marker.x / pixelRatio;
          const y = marker.y / pixelRatio;
          const dotRadius = clamp(7 * (marker.size / SINGLE_MARKER_SIZE), 7, 13);
          const labelWidth = Math.min(226, Math.max(92, 45 + marker.label.text.length * 6.4));
          const labelHeight = 28;
          const labelBottom = y - dotRadius - 9;
          const rectangle = {
            left: x - labelWidth / 2,
            right: x + labelWidth / 2,
            top: labelBottom - labelHeight,
            bottom: labelBottom,
          };

          if (occupiedRectangles.some((occupied) => rectanglesOverlap(rectangle, occupied))) continue;

          occupiedRectangles.push(rectangle);
          const element = labelElementsRef.current[nextPoolIndex];
          if (!element) continue;

          const labelSignature = `${marker.key}|${marker.label.text}|${marker.label.country}|${marker.label.flag}`;
          if (element.dataset.labelSignature !== labelSignature) {
            const accessibleLabel = `${marker.label.text}${marker.label.country ? ` · ${marker.label.country}` : ''}`;
            const iconElement = element.querySelector('.minimal-marker-label__icon');
            const textElement = element.querySelector('.minimal-marker-label__text');
            element.dataset.labelSignature = labelSignature;
            element.setAttribute('aria-label', accessibleLabel);
            element.setAttribute('title', accessibleLabel);
            iconElement?.classList.toggle('minimal-marker-label__icon--flag', Boolean(marker.label.flag));
            if (iconElement) iconElement.textContent = marker.label.flag || marker.label.icon;
            if (textElement) textElement.textContent = marker.label.text;
          }
          assignedLabelClustersRef.current[nextPoolIndex] = marker;

          const focus = clamp(
            (marker.z - LABEL_FOCUS_START) / (LABEL_FOCUS_FULL - LABEL_FOCUS_START),
            0,
            1
          );
          element.style.setProperty('--minimal-label-x', `${x}px`);
          element.style.setProperty('--minimal-label-y', `${labelBottom}px`);
          element.style.setProperty('--minimal-label-scale', String(0.92 + focus * 0.08));
          element.style.opacity = String(focus);
          const isVisible = focus > 0.04;
          const isInteractive = focus > 0.55;
          if (element.dataset.visible !== String(isVisible)) {
            element.dataset.visible = String(isVisible);
            element.style.visibility = isVisible ? 'visible' : 'hidden';
            element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
          }
          if (element.dataset.interactive !== String(isInteractive)) {
            element.dataset.interactive = String(isInteractive);
            element.style.pointerEvents = isInteractive ? 'auto' : 'none';
            element.tabIndex = isInteractive ? 0 : -1;
          }
          nextPoolIndex += 1;
        }

        for (let index = nextPoolIndex; index < LABEL_POOL_SIZE; index += 1) {
          const element = labelElementsRef.current[index];
          if (!element || !assignedLabelClustersRef.current[index]) continue;
          element.style.opacity = '0';
          element.style.visibility = 'hidden';
          element.style.pointerEvents = 'none';
          element.setAttribute('aria-hidden', 'true');
          element.tabIndex = -1;
          element.dataset.visible = 'false';
          element.dataset.interactive = 'false';
          assignedLabelClustersRef.current[index] = null;
        }
      },
    });

    let isIntersecting = true;
    let rendererPaused = false;
    const setRendererPaused = (paused) => {
      if (rendererPaused === paused) return;
      rendererPaused = paused;
      globe.toggle();
      if (!paused) lastRenderTimeRef.current = null;
    };
    const syncRendererVisibility = () => {
      setRendererPaused(document.hidden || !isIntersecting);
    };
    const handleReducedMotionChange = (event) => {
      prefersReducedMotionRef.current = event.matches;
      if (event.matches) autoRotateEnabledRef.current = false;
      else if (!pauseRotationRef.current && !markerFocusLockedRef.current) autoRotateEnabledRef.current = true;
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isIntersecting = entry?.isIntersecting ?? true;
      syncRendererVisibility();
    }, { threshold: 0.01 });

    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    intersectionObserver.observe(containerRef.current);
    document.addEventListener('visibilitychange', syncRendererVisibility);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    return () => {
      observer.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', syncRendererVisibility);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      globe.destroy();
    };
  }, []);

  function markActiveInteraction() {
    autoRotateEnabledRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!prefersReducedMotionRef.current && !markerFocusLockedRef.current && !pauseRotationRef.current) {
        autoRotateEnabledRef.current = true;
      }
    }, IDLE_TIMEOUT_MS);
  }

  function animateToLocation(lat, lng, duration = 800) {
    const target = getRotationForLocation(lat, lng);
    animationRef.current = {
      startTime: null,
      duration,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
      targetPhi: phiRef.current + normalizeAngle(target.phi - phiRef.current),
      targetTheta: clamp(target.theta, -MAX_TILT, MAX_TILT),
    };
  }

  function getActivePointers() {
    return [...activePointersRef.current.values()];
  }

  function beginPinchZoom() {
    const distance = getPointerDistance(getActivePointers());
    if (distance < PINCH_MIN_DISTANCE) return;

    pointerStateRef.current = {
      ...pointerStateRef.current,
      active: true,
      moved: true,
      pointerId: null,
      mode: 'pinch',
      startDistance: distance,
      startScale: scaleRef.current,
    };
  }

  function resumeDragFromRemainingPointer() {
    const [remainingPointer] = activePointersRef.current.entries();
    if (!remainingPointer) {
      pointerStateRef.current.active = false;
      pointerStateRef.current.pointerId = null;
      return;
    }

    const [pointerId, pointer] = remainingPointer;
    pointerStateRef.current = {
      active: true,
      moved: true,
      pointerId,
      mode: 'drag',
      startX: pointer.clientX,
      startY: pointer.clientY,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
      startDistance: 0,
      startScale: scaleRef.current,
    };
  }

  function findHitMarker(event) {
    if (!canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const pixelRatio = pixelRatioRef.current;
    const x = (event.clientX - rect.left) * pixelRatio;
    const y = (event.clientY - rect.top) * pixelRatio;

    return projectedMarkersRef.current.find((marker) => {
      const dx = marker.x - x;
      const dy = marker.y - y;
      return dx * dx + dy * dy <= marker.radius * marker.radius;
    });
  }

  function handlePointerDown(event) {
    event.preventDefault();
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (activePointersRef.current.size >= 2) {
      beginPinchZoom();
      animationRef.current = null;
      markActiveInteraction();
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    pointerStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      mode: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      startPhi: phiRef.current,
      startTheta: thetaRef.current,
      startDistance: 0,
      startScale: scaleRef.current,
    };
    animationRef.current = null;
    markActiveInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    const hitMarker = findHitMarker(event);
    isHoveringMarkerRef.current = !!hitMarker;
    event.currentTarget.style.cursor = pointerStateRef.current.active
      ? 'grabbing'
      : hitMarker
        ? 'pointer'
        : 'grab';

    if (!pointerStateRef.current.active) return;

    event.preventDefault();

    if (activePointersRef.current.size >= 2 || pointerStateRef.current.mode === 'pinch') {
      if (pointerStateRef.current.mode !== 'pinch') {
        beginPinchZoom();
      }

      const distance = getPointerDistance(getActivePointers());
      if (distance >= PINCH_MIN_DISTANCE && pointerStateRef.current.startDistance >= PINCH_MIN_DISTANCE) {
        scaleRef.current = clamp(
          pointerStateRef.current.startScale * (distance / pointerStateRef.current.startDistance),
          MIN_SCALE,
          MAX_SCALE
        );
        markActiveInteraction();
      }
      return;
    }

    if (pointerStateRef.current.pointerId !== event.pointerId) return;

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
    if (!activePointersRef.current.has(event.pointerId) && pointerStateRef.current.pointerId !== event.pointerId) return;

    const wasPinch = pointerStateRef.current.mode === 'pinch' || activePointersRef.current.size > 1;
    activePointersRef.current.delete(event.pointerId);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (wasPinch) {
      resumeDragFromRemainingPointer();
      return;
    }

    if (pointerStateRef.current.pointerId !== event.pointerId) return;

    const wasDrag = pointerStateRef.current.moved;
    pointerStateRef.current.active = false;
    pointerStateRef.current.pointerId = null;

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
    activePointersRef.current.delete(event.pointerId);
    isHoveringMarkerRef.current = false;
    event.currentTarget.style.cursor = 'grab';
  }

  function handleLabelClick(cluster) {
    if (!cluster) return;
    markerFocusLockedRef.current = true;
    autoRotateEnabledRef.current = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    animateToLocation(cluster.lat, cluster.lng);
    const payload = cluster.members.length === 1 ? cluster.members[0] : cluster.members;
    onMarkerClick(payload);
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
        style={{ touchAction: 'none', overscrollBehavior: 'none', cursor: 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
      <canvas
        ref={markerCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 z-30" aria-label="Visible globe locations">
        {Array.from({ length: LABEL_POOL_SIZE }, (_, index) => (
          <button
            key={index}
            ref={(element) => {
              labelElementsRef.current[index] = element;
            }}
            type="button"
            className={`minimal-marker-label ${darkMode ? 'minimal-marker-label--dark' : 'minimal-marker-label--light'}`}
            style={{ '--minimal-marker-color': markerColor }}
            aria-hidden="true"
            tabIndex={-1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleLabelClick(assignedLabelClustersRef.current[index]);
            }}
          >
            <span className="minimal-marker-label__icon" aria-hidden="true" />
            <span className="minimal-marker-label__text" />
          </button>
        ))}
      </div>
    </div>
  );
}
