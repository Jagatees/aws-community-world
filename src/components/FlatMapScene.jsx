import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countriesTopo from 'world-atlas/countries-110m.json';

const CATEGORY_COLORS = {
  'heroes': '#FF9900',
  'community-builders': '#1A9C3E',
  'user-groups': '#00A1C9',
  'cloud-clubs': '#BF0816',
};

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 540;
const MAP_PADDING = 28;
const FOCUS_SCALE = 2.2;
const MAX_CLUSTER_AVATARS = 3;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;
const ZOOM_STEP = 1.35;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMemberImage(member) {
  if (member.avatarUrl) return member.avatarUrl;
  if (Array.isArray(member.ledBy)) {
    const leaderImage = member.ledBy.find((leader) => leader?.imageUrl)?.imageUrl;
    if (leaderImage) return leaderImage;
  }
  return '';
}

function getPanBounds(zoomLevel) {
  const overflowX = Math.max(0, (zoomLevel - 1) * MAP_WIDTH * 0.4);
  const overflowY = Math.max(0, (zoomLevel - 1) * MAP_HEIGHT * 0.4);

  return {
    minX: -overflowX,
    maxX: overflowX,
    minY: -(overflowY + 70),
    maxY: overflowY + 110,
  };
}

function clusterProjectedMembers(members, projection, zoomLevel) {
  const threshold = clamp(44 / zoomLevel, 12, 44);
  const clusters = [];

  for (const member of members) {
    const projected = projection([member.lng, member.lat]);
    if (!projected) continue;

    const [x, y] = projected;
    const existing = clusters.find((cluster) => {
      const dx = cluster.x - x;
      const dy = cluster.y - y;
      return Math.hypot(dx, dy) <= threshold;
    });

    if (existing) {
      existing.members.push(member);
      const count = existing.members.length;
      existing.x = ((existing.x * (count - 1)) + x) / count;
      existing.y = ((existing.y * (count - 1)) + y) / count;
      existing.lat = ((existing.lat * (count - 1)) + member.lat) / count;
      existing.lng = ((existing.lng * (count - 1)) + member.lng) / count;
    } else {
      clusters.push({
        lat: member.lat,
        lng: member.lng,
        x,
        y,
        members: [member],
      });
    }
  }

  return clusters;
}

function buildProjection(activeTarget) {
  const projection = geoNaturalEarth1();
  projection.fitExtent(
    [
      [MAP_PADDING, MAP_PADDING],
      [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
    ],
    { type: 'Sphere' }
  );

  if (activeTarget) {
    projection
      .center([activeTarget.lng, activeTarget.lat])
      .scale(projection.scale() * FOCUS_SCALE)
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2 + 10]);
  }

  return projection;
}

export default function FlatMapScene({ category, members, onMarkerClick, cardOpen, darkMode, flyToTarget, zoomCommand }) {
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [manualZoom, setManualZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [resetViewLockedKey, setResetViewLockedKey] = useState(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const suppressClickRef = useRef(false);

  const flyToTargetKey = flyToTarget ? `${flyToTarget.lat}:${flyToTarget.lng}` : 'none';
  const resetViewLocked = resetViewLockedKey === flyToTargetKey;

  const activeTarget = resetViewLocked
    ? null
    : cardOpen
      ? (focusedTarget ?? flyToTarget)
      : (flyToTarget ?? focusedTarget);
  const effectiveZoom = activeTarget ? manualZoom * FOCUS_SCALE : manualZoom;

  const { pathGenerator, countries, graticulePath, markers } = useMemo(() => {
    const projection = buildProjection(activeTarget ? { lat: activeTarget.lat, lng: activeTarget.lng } : null);
    projection.scale(projection.scale() * manualZoom);

    const path = geoPath(projection);
    const countryFeatures = feature(countriesTopo, countriesTopo.objects.countries).features;
    const clusteredMarkers = clusterProjectedMembers(members, projection, effectiveZoom).map((cluster) => ({
      ...cluster,
      size: cluster.members.length > 1 ? Math.min(34, 14 + Math.sqrt(cluster.members.length) * 4) : 10,
    }));

    return {
      pathGenerator: path,
      countries: countryFeatures,
      graticulePath: path(geoGraticule10()),
      markers: clusteredMarkers,
    };
  }, [activeTarget, members, manualZoom, effectiveZoom]);

  const markerColor = CATEGORY_COLORS[category] ?? '#FF9900';
  const panelBg = darkMode ? 'rgba(10, 18, 27, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const panelBorder = darkMode ? 'rgba(62, 95, 123, 0.42)' : 'rgba(150, 179, 205, 0.7)';
  const oceanFill = darkMode ? '#091521' : '#edf7ff';
  const countryFill = darkMode ? 'rgba(59, 84, 110, 0.88)' : 'rgba(201, 220, 237, 0.95)';
  const countryStroke = darkMode ? 'rgba(120, 158, 191, 0.55)' : 'rgba(112, 146, 177, 0.72)';
  const gridStroke = darkMode ? 'rgba(118, 152, 184, 0.12)' : 'rgba(90, 124, 156, 0.12)';
  const controlBg = darkMode ? 'rgba(7, 16, 25, 0.72)' : 'rgba(255, 255, 255, 0.82)';

  function zoomIn() {
    setManualZoom((zoom) => clamp(zoom * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  }

  function zoomOut() {
    setManualZoom((zoom) => clamp(zoom / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
  }

  function resetView() {
    setManualZoom(1);
    setFocusedTarget(null);
    setPan({ x: 0, y: 0 });
    setResetViewLockedKey(flyToTargetKey);
  }

  function handleWheel(event) {
    event.preventDefault();
    setManualZoom((zoom) => clamp(zoom - event.deltaY * WHEEL_ZOOM_SENSITIVITY, MIN_ZOOM, MAX_ZOOM));
  }

  useEffect(() => {
    if (!zoomCommand?.direction) return;
    if (zoomCommand.direction === 'in') {
      setManualZoom((zoom) => clamp(zoom * ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
    } else if (zoomCommand.direction === 'out') {
      setManualZoom((zoom) => clamp(zoom / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM));
    }
  }, [zoomCommand]);

  function handlePointerDown(event) {
    const target = event.target;
    if (
      typeof target?.closest === 'function' &&
      (target.closest('[data-marker-interactive="true"]') || target.closest('[data-map-control="true"]'))
    ) {
      return;
    }

    setIsDragging(true);
    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!dragStateRef.current.active || dragStateRef.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - dragStateRef.current.startX;
    const dy = event.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStateRef.current.moved = true;
      suppressClickRef.current = true;
    }

    const bounds = getPanBounds(effectiveZoom);
    setPan({
      x: clamp(dragStateRef.current.originX + dx, bounds.minX, bounds.maxX),
      y: clamp(dragStateRef.current.originY + dy, bounds.minY, bounds.maxY),
    });
  }

  function finishPan(event) {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragStateRef.current.moved) {
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
    setIsDragging(false);
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${darkMode ? 'aws-globe-bg-dark' : 'aws-globe-bg-light'}`}>
      <div className="aws-globe-pattern" />

      <div className="relative z-10 flex h-full items-center justify-center px-4 py-6">
        <div
          className="relative w-full max-w-7xl overflow-hidden rounded-[28px]"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPan}
          onPointerCancel={finishPan}
          style={{
            background: panelBg,
            border: `1px solid ${panelBorder}`,
            boxShadow: darkMode ? '0 28px 70px rgba(0, 0, 0, 0.38)' : '0 24px 60px rgba(86, 116, 145, 0.16)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: darkMode
                ? 'radial-gradient(circle at 15% 12%, rgba(255,153,0,0.12), transparent 0 18%), radial-gradient(circle at 80% 15%, rgba(0,161,201,0.14), transparent 0 20%), linear-gradient(180deg, rgba(8,15,23,0.98) 0%, rgba(11,24,36,0.98) 100%)'
                : 'radial-gradient(circle at 15% 12%, rgba(255,153,0,0.08), transparent 0 18%), radial-gradient(circle at 80% 15%, rgba(0,161,201,0.10), transparent 0 20%), linear-gradient(180deg, rgba(246,251,255,0.98) 0%, rgba(230,241,250,0.98) 100%)',
            }}
          />

          <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="relative z-10 h-full w-full" aria-label="Flat world map">
            <defs>
              <filter id="flat-marker-glow" x="-200%" y="-200%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill={oceanFill} opacity="0.88" />

            <g transform={`translate(${pan.x} ${pan.y})`}>
              {graticulePath && (
                <path
                  d={graticulePath}
                  fill="none"
                  stroke={gridStroke}
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              <g>
                {countries.map((country) => (
                  <path
                    key={country.id ?? country.properties?.name}
                    d={pathGenerator(country) ?? ''}
                    fill={countryFill}
                    stroke={countryStroke}
                    strokeWidth="0.9"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>

              <g>
              {markers.map((marker) => {
                const payload = marker.members.length === 1 ? marker.members[0] : marker.members;
                const visibleImages = marker.members
                  .map((member) => ({ src: getMemberImage(member), name: member.name }))
                  .filter((member) => member.src)
                  .slice(0, MAX_CLUSTER_AVATARS);
                const markerId = `${marker.lat}-${marker.lng}-${marker.members.length}`.replace(/[^a-zA-Z0-9_-]/g, '-');
                const singleAvatarSize = marker.size * 2.05;
                const clusterAvatarSize = Math.max(16, marker.size * 1.18);
                const clusterSpacing = clusterAvatarSize * 0.58;
                const stackWidth = visibleImages.length > 0
                  ? clusterAvatarSize + (visibleImages.length - 1) * clusterSpacing
                  : 0;
                const stackOffsetX = visibleImages.length > 1 ? stackWidth / 2 : clusterAvatarSize / 2;
                const badgeCount = Math.max(0, marker.members.length - visibleImages.length);

                return (
                  <g key={`${marker.lat}-${marker.lng}-${marker.members.length}`} transform={`translate(${marker.x} ${marker.y})`}>
                    {visibleImages.length > 0 ? (
                      <>
                        <ellipse
                          cx={visibleImages.length > 1 ? -stackOffsetX / 2 + clusterAvatarSize / 2 : 0}
                          cy="0"
                          rx={visibleImages.length > 1 ? stackWidth * 0.56 : singleAvatarSize * 0.6}
                          ry={visibleImages.length > 1 ? clusterAvatarSize * 0.9 : singleAvatarSize * 0.6}
                          fill={markerColor}
                          opacity="0.22"
                          filter="url(#flat-marker-glow)"
                          pointerEvents="none"
                        />
                        {visibleImages.length === 1 ? (
                          <>
                            <clipPath id={`flat-avatar-clip-${markerId}`}>
                              <circle r={singleAvatarSize / 2} />
                            </clipPath>
                            <image
                              href={visibleImages[0].src}
                              x={-singleAvatarSize / 2}
                              y={-singleAvatarSize / 2}
                              width={singleAvatarSize}
                              height={singleAvatarSize}
                              preserveAspectRatio="xMidYMid slice"
                              clipPath={`url(#flat-avatar-clip-${markerId})`}
                              pointerEvents="none"
                            />
                            <circle
                              r={singleAvatarSize / 2}
                              fill="transparent"
                              stroke={darkMode ? '#09131c' : '#ffffff'}
                              strokeWidth="2.5"
                              pointerEvents="none"
                            />
                          </>
                        ) : (
                          visibleImages.map((member, index) => {
                            const x = index * clusterSpacing - stackOffsetX;
                            return (
                              <g key={`${markerId}-${index}`} transform={`translate(${x} ${index % 2 === 0 ? -2 : 2})`}>
                                <clipPath id={`flat-avatar-clip-${markerId}-${index}`}>
                                  <circle r={clusterAvatarSize / 2} />
                                </clipPath>
                                <image
                                  href={member.src}
                                  x={-clusterAvatarSize / 2}
                                  y={-clusterAvatarSize / 2}
                                  width={clusterAvatarSize}
                                  height={clusterAvatarSize}
                                  preserveAspectRatio="xMidYMid slice"
                                  clipPath={`url(#flat-avatar-clip-${markerId}-${index})`}
                                  pointerEvents="none"
                                />
                                <circle
                                  r={clusterAvatarSize / 2}
                                  fill="transparent"
                                  stroke={darkMode ? '#09131c' : '#ffffff'}
                                  strokeWidth="2.2"
                                  pointerEvents="none"
                                />
                              </g>
                            );
                          })
                        )}
                        {badgeCount > 0 && (
                          <g transform={`translate(${stackOffsetX - clusterAvatarSize * 0.12} ${clusterAvatarSize * 0.45})`}>
                            <circle
                              r={clusterAvatarSize * 0.36}
                              fill={markerColor}
                              stroke={darkMode ? '#09131c' : '#ffffff'}
                              strokeWidth="2"
                              pointerEvents="none"
                            />
                            <text
                              y="1"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill="#0F1923"
                              fontSize="10"
                              fontWeight="800"
                              pointerEvents="none"
                            >
                              +{badgeCount}
                            </text>
                          </g>
                        )}
                      </>
                    ) : (
                      <>
                        <circle
                          r={marker.size * 0.88}
                          fill={markerColor}
                          opacity="0.28"
                          filter="url(#flat-marker-glow)"
                          pointerEvents="none"
                        />
                        <circle
                          r={marker.size}
                          fill={markerColor}
                          stroke={darkMode ? '#09131c' : '#ffffff'}
                          strokeWidth="2.5"
                          pointerEvents="none"
                        />
                        {marker.members.length > 1 && (
                          <text
                            y="1"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#0F1923"
                            fontSize={marker.members.length > 9 ? '10' : '11'}
                            fontWeight="800"
                            pointerEvents="none"
                          >
                            {marker.members.length}
                          </text>
                        )}
                      </>
                    )}
                    <circle
                      r={Math.max(marker.size + 12, singleAvatarSize * 0.8, clusterAvatarSize + 12)}
                      fill="transparent"
                      data-marker-interactive="true"
                      pointerEvents="all"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (suppressClickRef.current) {
                          suppressClickRef.current = false;
                          return;
                        }
                        setResetViewLockedKey(null);
                        setPan({ x: 0, y: 0 });
                        setFocusedTarget({ lat: marker.lat, lng: marker.lng });
                        if (marker.members.length > 1 && effectiveZoom < 4.5) {
                          setManualZoom((zoom) => clamp(zoom * 1.7, MIN_ZOOM, MAX_ZOOM));
                          return;
                        }
                        onMarkerClick(payload);
                      }}
                    />
                  </g>
                );
              })}
              </g>
            </g>
          </svg>

          <div
            className="pointer-events-none absolute left-5 top-5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{
              color: darkMode ? '#A7BDCF' : '#537190',
              background: darkMode ? 'rgba(7, 16, 25, 0.62)' : 'rgba(255, 255, 255, 0.74)',
              border: `1px solid ${panelBorder}`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            Flat Map
          </div>

          <div className="absolute right-5 top-5 flex items-center gap-2" style={{ zIndex: 20 }}>
            <div
              data-map-control="true"
              className="rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                color: darkMode ? '#DCE7F0' : '#23415E',
                background: controlBg,
                border: `1px solid ${panelBorder}`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              Zoom {manualZoom.toFixed(1)}x
            </div>
            <button
              type="button"
              data-map-control="true"
              onClick={zoomOut}
              className="h-9 w-9 rounded-full text-lg font-semibold"
              style={{
                color: darkMode ? '#DCE7F0' : '#23415E',
                background: controlBg,
                border: `1px solid ${panelBorder}`,
              }}
              aria-label="Zoom out flat map"
            >
              -
            </button>
            <button
              type="button"
              data-map-control="true"
              onClick={zoomIn}
              className="h-9 w-9 rounded-full text-lg font-semibold"
              style={{
                color: darkMode ? '#DCE7F0' : '#23415E',
                background: controlBg,
                border: `1px solid ${panelBorder}`,
              }}
              aria-label="Zoom in flat map"
            >
              +
            </button>
            <button
              type="button"
              data-map-control="true"
              onClick={resetView}
              className="rounded-full px-3 py-2 text-xs font-semibold"
              style={{
                color: darkMode ? '#DCE7F0' : '#23415E',
                background: controlBg,
                border: `1px solid ${panelBorder}`,
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
