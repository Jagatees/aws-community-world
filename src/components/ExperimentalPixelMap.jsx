import { useEffect, useRef, useState } from 'react';
import { geoCentroid, geoContains } from 'd3-geo';
import { feature as topoFeature } from 'topojson-client';
import countriesTopo from 'world-atlas/countries-110m.json';
import userGroups from '../data/user-groups.json';

const LOW_POWER_QUERY = '(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)';

function isLowPowerDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return Boolean(
    window.matchMedia(LOW_POWER_QUERY).matches
    || navigator.hardwareConcurrency <= 4
    || (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || connection?.saveData
    || /(^|-)2g$/.test(connection?.effectiveType || '')
  );
}

function getGlobePixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, isLowPowerDevice() ? 1.25 : 1.75);
}

const WORLD = topoFeature(countriesTopo, countriesTopo.objects.countries);
const COUNTRY_COLUMNS = 38;
const COUNTRY_ROWS = 19;
const GROUP_REVEAL_START = 2.55;
const GROUP_REVEAL_DURATION = 1.35;
const TOTAL_ANIMATION_DURATION = 5;
const COUNTRY_FEATURES = WORLD.features.filter((country) => country.properties.name !== 'Antarctica');
const COUNTRY_METADATA = COUNTRY_FEATURES.map((feature) => ({
  feature,
  id: feature.id,
  name: feature.properties.name,
  centroid: geoCentroid(feature),
}));

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function seededNoise(a, b) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function easeOutBack(value) {
  const overshoot = 1.70158;
  const shifted = value - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

function distanceToCountry(group, country) {
  const longitudeDelta = Math.abs(group.lng - country.centroid[0]);
  const wrappedLongitudeDelta = Math.min(longitudeDelta, 360 - longitudeDelta);
  const latitudeDelta = group.lat - country.centroid[1];
  const longitudeScale = Math.cos((group.lat * Math.PI) / 180);
  return (wrappedLongitudeDelta * longitudeScale) ** 2 + latitudeDelta ** 2;
}

function locateCountry(group) {
  const containingCountry = COUNTRY_METADATA.find((country) => (
    geoContains(country.feature, [group.lng, group.lat])
  ));
  if (containingCountry) return containingCountry;

  return COUNTRY_METADATA.reduce((closest, country) => (
    distanceToCountry(group, country) < distanceToCountry(group, closest) ? country : closest
  ));
}

const MAPPED_USER_GROUPS = userGroups
  .filter((group) => Number.isFinite(group.lat) && Number.isFinite(group.lng) && (group.lat !== 0 || group.lng !== 0))
  .map((group, index) => {
    const country = locateCountry(group);
    return {
      ...group,
      countryId: country.id,
      pixelOrder: seededNoise(index + 311, Math.round(group.lng * 10) + 503),
    };
  });

function findAvailableCell(targetColumn, targetRow, occupiedCells) {
  let bestCell = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let row = 0; row < COUNTRY_ROWS; row += 1) {
    for (let column = 0; column < COUNTRY_COLUMNS; column += 1) {
      if (occupiedCells.has(`${column}:${row}`)) continue;
      const columnDistance = column - targetColumn;
      const rowDistance = (row - targetRow) * 1.35;
      const score = columnDistance ** 2 + rowDistance ** 2;
      if (score < bestScore) {
        bestScore = score;
        bestCell = { column, row };
      }
    }
  }

  return bestCell;
}

function createCountryTiles() {
  const groupsByCountry = new Map();
  MAPPED_USER_GROUPS.forEach((group) => {
    const countryGroups = groupsByCountry.get(group.countryId) ?? [];
    countryGroups.push(group);
    groupsByCountry.set(group.countryId, countryGroups);
  });

  const occupiedCells = new Set();
  return [...COUNTRY_METADATA]
    .sort((countryA, countryB) => {
      const groupDifference = (groupsByCountry.get(countryB.id)?.length ?? 0)
        - (groupsByCountry.get(countryA.id)?.length ?? 0);
      return groupDifference || countryA.name.localeCompare(countryB.name);
    })
    .map((country, index) => {
      const targetColumn = clamp(
        Math.round(((country.centroid[0] + 180) / 360) * (COUNTRY_COLUMNS - 1)),
        0,
        COUNTRY_COLUMNS - 1,
      );
      const targetRow = clamp(
        Math.round(((82 - clamp(country.centroid[1], -82, 82)) / 164) * (COUNTRY_ROWS - 1)),
        0,
        COUNTRY_ROWS - 1,
      );
      const cell = findAvailableCell(targetColumn, targetRow, occupiedCells);
      occupiedCells.add(`${cell.column}:${cell.row}`);
      const groups = (groupsByCountry.get(country.id) ?? [])
        .sort((groupA, groupB) => groupA.pixelOrder - groupB.pixelOrder);
      const colorNoise = seededNoise(index + 71, Number.parseInt(country.id, 10) || index);

      return {
        ...country,
        ...cell,
        groups,
        groupCount: groups.length,
        revealDelay: 0.45 + seededNoise(cell.row + 19, cell.column + 37) * 1.5,
        groupRevealDelay: seededNoise(cell.column + 109, cell.row + 211) * GROUP_REVEAL_DURATION,
        color: colorNoise > 0.82
          ? '#FFB347'
          : colorNoise > 0.45
            ? '#FF9900'
            : '#D98200',
      };
    });
}

const COUNTRY_TILES = createCountryTiles();
const COUNTRY_TILE_BY_ID = new Map(COUNTRY_TILES.map((tile) => [tile.id, tile]));
const FEATURED_LABEL_CONFIG = [
  { name: 'AWS User Group Singapore', dx: 9, dy: -16 },
  { name: 'Berlin AWS User Group', dx: 8, dy: -17 },
  { name: 'AWS User Group São Paulo', dx: 8, dy: 12 },
  { name: 'AWS User Group Hyderabad', dx: 8, dy: 12 },
  { name: 'AWS Amplify Japan User Group', dx: 8, dy: -17 },
  { name: 'AWS User Group Kenya', dx: 8, dy: 12 },
  { name: 'AWS User Group Seattle | AWSUGSEA', dx: 8, dy: -17 },
];
const FEATURED_GROUPS = FEATURED_LABEL_CONFIG
  .map((config) => {
    const group = MAPPED_USER_GROUPS.find((candidate) => candidate.name === config.name);
    const tile = group ? COUNTRY_TILE_BY_ID.get(group.countryId) : null;
    return group && tile ? { ...group, ...config, tile } : null;
  })
  .filter(Boolean);

function getMapLayout(width, height) {
  const mobile = width < 680;
  const maxWidth = mobile ? width - 26 : width * 0.82;
  const maxHeight = mobile ? height * 0.32 : height * 0.67;
  const mapWidth = Math.min(maxWidth, maxHeight * (COUNTRY_COLUMNS / COUNTRY_ROWS));
  const mapHeight = mapWidth * (COUNTRY_ROWS / COUNTRY_COLUMNS);

  return {
    x: mobile ? (width - mapWidth) * 0.5 : width - mapWidth - 18,
    y: mobile ? Math.max(315, height * 0.42) : Math.max(152, (height - mapHeight) * 0.54),
    cellWidth: mapWidth / COUNTRY_COLUMNS,
    cellHeight: mapHeight / COUNTRY_ROWS,
    mapWidth,
    mapHeight,
  };
}

function getTilePoint(tile, layout) {
  return {
    x: layout.x + (tile.column + 0.5) * layout.cellWidth,
    y: layout.y + (tile.row + 0.5) * layout.cellHeight,
  };
}

export default function ExperimentalPixelMap() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const replayRef = useRef(() => {});
  const [lowPower] = useState(() => isLowPowerDevice());
  const [assembledCount, setAssembledCount] = useState(0);
  const [visibleGroupCount, setVisibleGroupCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return undefined;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let assemblyStartedAt = performance.now() - (reduceMotion ? TOTAL_ANIMATION_DURATION * 1000 : 0);
    let animationFrame = 0;
    let lastHudUpdate = 0;
    let lastElapsed = reduceMotion ? TOTAL_ANIMATION_DURATION : 0;
    let width = 1;
    let height = 1;
    let mounted = true;

    const drawGrid = (layout) => {
      context.save();
      context.translate(0.5, 0.5);
      context.strokeStyle = 'rgba(62, 145, 180, 0.16)';
      context.lineWidth = 1;
      context.beginPath();

      for (let column = 0; column <= COUNTRY_COLUMNS; column += 1) {
        const x = layout.x + column * layout.cellWidth;
        context.moveTo(x, layout.y);
        context.lineTo(x, layout.y + layout.mapHeight);
      }
      for (let row = 0; row <= COUNTRY_ROWS; row += 1) {
        const y = layout.y + row * layout.cellHeight;
        context.moveTo(layout.x, y);
        context.lineTo(layout.x + layout.mapWidth, y);
      }

      context.stroke();
      context.restore();
    };

    const drawCountryGroups = (tile, layout, elapsed) => {
      if (!tile.groupCount) return 0;
      const revealProgress = clamp(
        (elapsed - GROUP_REVEAL_START - tile.groupRevealDelay) / 0.52,
        0,
        1,
      );
      if (revealProgress <= 0) return 0;

      const visibleGroups = revealProgress >= 1
        ? tile.groupCount
        : Math.floor(tile.groupCount * revealProgress);
      if (!visibleGroups) return 0;

      const point = getTilePoint(tile, layout);
      const tileWidth = Math.max(2, layout.cellWidth - (lowPower ? 1.4 : 2.2));
      const tileHeight = Math.max(2, layout.cellHeight - (lowPower ? 1.4 : 2.2));
      const pixelColumns = Math.ceil(Math.sqrt(tile.groupCount));
      const pixelRows = Math.ceil(tile.groupCount / pixelColumns);
      const innerWidth = tileWidth * 0.72;
      const innerHeight = tileHeight * 0.72;
      const stepX = innerWidth / pixelColumns;
      const stepY = innerHeight / pixelRows;
      const pixelSize = Math.max(0.55, Math.min(stepX, stepY) * 0.52);

      context.save();
      context.globalAlpha = 0.95;
      context.fillStyle = '#69E3FF';
      if (revealProgress < 0.92) {
        context.shadowColor = '#00A1C9';
        context.shadowBlur = (1 - revealProgress) * 10;
      }
      for (let index = 0; index < visibleGroups; index += 1) {
        const column = index % pixelColumns;
        const row = Math.floor(index / pixelColumns);
        const x = point.x - innerWidth * 0.5 + (column + 0.5) * stepX;
        const y = point.y - innerHeight * 0.5 + (row + 0.5) * stepY;
        context.fillRect(x - pixelSize * 0.5, y - pixelSize * 0.5, pixelSize, pixelSize);
      }
      context.strokeStyle = `rgba(105, 227, 255, ${0.42 + revealProgress * 0.45})`;
      context.lineWidth = 0.8;
      context.strokeRect(
        point.x - tileWidth * 0.5 + 0.5,
        point.y - tileHeight * 0.5 + 0.5,
        tileWidth - 1,
        tileHeight - 1,
      );
      context.restore();

      return visibleGroups;
    };

    const drawLabels = (layout, elapsed) => {
      const mobile = width < 680;
      const featuredGroups = mobile ? FEATURED_GROUPS.slice(0, 3) : FEATURED_GROUPS;

      featuredGroups.forEach((group) => {
        const revealProgress = clamp(
          (elapsed - GROUP_REVEAL_START - group.tile.groupRevealDelay - 0.28) / 0.34,
          0,
          1,
        );
        if (revealProgress <= 0) return;

        const point = getTilePoint(group.tile, layout);
        const city = group.location.split(',')[0].trim().toUpperCase();
        const fontSize = mobile ? 7 : 8;
        context.save();
        context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const textWidth = context.measureText(city).width;
        const boxWidth = textWidth + 10;
        const boxHeight = fontSize + 8;
        const labelX = clamp(
          point.x + group.dx,
          layout.x + 2,
          layout.x + layout.mapWidth - boxWidth - 2,
        );
        const labelY = clamp(
          point.y + group.dy,
          layout.y + 2,
          layout.y + layout.mapHeight - boxHeight - 2,
        );
        const connectorX = labelX > point.x ? labelX : labelX + boxWidth;
        const connectorY = labelY + boxHeight * 0.5;

        context.globalAlpha = revealProgress;
        context.strokeStyle = 'rgba(105, 227, 255, 0.68)';
        context.lineWidth = 0.75;
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(connectorX, connectorY);
        context.stroke();
        context.fillStyle = 'rgba(7, 22, 33, 0.92)';
        context.fillRect(labelX, labelY, boxWidth, boxHeight);
        context.strokeStyle = 'rgba(0, 161, 201, 0.86)';
        context.strokeRect(labelX + 0.5, labelY + 0.5, boxWidth - 1, boxHeight - 1);
        context.fillStyle = '#9CEBFF';
        context.fillText(city, labelX + 5, labelY + fontSize + 3);
        context.restore();
      });
    };

    const draw = (elapsed) => {
      lastElapsed = elapsed;
      context.clearRect(0, 0, width, height);
      const layout = getMapLayout(width, height);
      drawGrid(layout);

      let assembled = 0;
      COUNTRY_TILES.forEach((tile) => {
        const localProgress = clamp((elapsed - tile.revealDelay) / 0.46, 0, 1);
        if (localProgress <= 0) return;
        if (localProgress >= 1) assembled += 1;

        const point = getTilePoint(tile, layout);
        const scale = clamp(easeOutBack(localProgress), 0, 1.16);
        const tileWidth = Math.max(2, layout.cellWidth - (lowPower ? 1.4 : 2.2)) * scale;
        const tileHeight = Math.max(2, layout.cellHeight - (lowPower ? 1.4 : 2.2)) * scale;

        context.save();
        context.globalAlpha = clamp(localProgress * 1.7, 0, tile.groupCount ? 1 : 0.72);
        if (localProgress < 0.92) {
          context.shadowColor = 'rgba(255, 153, 0, 0.9)';
          context.shadowBlur = (1 - localProgress) * 14;
        }
        context.fillStyle = tile.color;
        context.fillRect(
          point.x - tileWidth * 0.5,
          point.y - tileHeight * 0.5,
          tileWidth,
          tileHeight,
        );
        context.restore();
      });

      let visibleGroups = 0;
      COUNTRY_TILES.forEach((tile) => {
        visibleGroups += drawCountryGroups(tile, layout, elapsed);
      });
      drawLabels(layout, elapsed);

      return { assembled, visibleGroups };
    };

    const resize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      const pixelRatio = getGlobePixelRatio();
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(lastElapsed);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const render = (time) => {
      const elapsed = (time - assemblyStartedAt) / 1000;
      const { assembled, visibleGroups } = draw(elapsed);

      if (time - lastHudUpdate > 80 || visibleGroups === MAPPED_USER_GROUPS.length) {
        lastHudUpdate = time;
        if (mounted) {
          setAssembledCount(assembled);
          setVisibleGroupCount(visibleGroups);
        }
      }

      if (visibleGroups === MAPPED_USER_GROUPS.length || elapsed >= TOTAL_ANIMATION_DURATION) {
        if (mounted) {
          setAssembledCount(COUNTRY_TILES.length);
          setVisibleGroupCount(MAPPED_USER_GROUPS.length);
          setIsComplete(true);
        }
        draw(TOTAL_ANIMATION_DURATION);
        return;
      }

      animationFrame = requestAnimationFrame(render);
    };

    const replay = () => {
      cancelAnimationFrame(animationFrame);
      assemblyStartedAt = performance.now();
      lastHudUpdate = 0;
      setAssembledCount(0);
      setVisibleGroupCount(0);
      setIsComplete(false);
      animationFrame = requestAnimationFrame(render);
    };
    replayRef.current = replay;
    animationFrame = requestAnimationFrame(render);

    return () => {
      mounted = false;
      replayRef.current = () => {};
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [lowPower]);

  const terrainComplete = assembledCount === COUNTRY_TILES.length;
  const progress = terrainComplete
    ? visibleGroupCount / MAPPED_USER_GROUPS.length
    : assembledCount / COUNTRY_TILES.length;
  const status = isComplete
    ? 'USER GROUP NETWORK ONLINE'
    : terrainComplete
      ? 'CONNECTING USER GROUPS'
      : 'ASSEMBLING COUNTRIES';

  return (
    <section ref={containerRef} className="pixel-globe" aria-label="AWS User Group country-square map">
      <canvas ref={canvasRef} className="pixel-globe__canvas pixel-globe__canvas--2d" aria-hidden="true" />
      <div className="pixel-globe__aurora" aria-hidden="true" />
      <div className="pixel-globe__vignette" aria-hidden="true" />

      <header className="pixel-globe__intro">
        <span className="pixel-globe__eyebrow"><i /> AWS USER GROUPS / COUNTRY MOSAIC</span>
        <h2>One square for every country.</h2>
        <p>Cyan pixels inside each country show its AWS User Groups.</p>
        <div className="pixel-globe__progress" aria-live="polite">
          <div className="pixel-globe__progress-meta">
            <span>{status}</span>
            <b>
              {terrainComplete
                ? `${visibleGroupCount.toLocaleString()} / ${MAPPED_USER_GROUPS.length.toLocaleString()}`
                : `${assembledCount.toLocaleString()} / ${COUNTRY_TILES.length.toLocaleString()}`}
            </b>
          </div>
          <div className="pixel-globe__progress-track">
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
        </div>
      </header>

      <button className="pixel-globe__replay" type="button" onClick={() => replayRef.current()}>
        <span aria-hidden="true">↻</span>
        Replay network
      </button>

      <div className="pixel-globe__hint" aria-hidden="true">
        <span>{COUNTRY_TILES.length} COUNTRY SQUARES</span>
        <i />
        <span>{MAPPED_USER_GROUPS.length} USER GROUP PIXELS</span>
      </div>
    </section>
  );
}

