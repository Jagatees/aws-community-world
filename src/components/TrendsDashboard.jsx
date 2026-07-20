import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import growthHistory from '../data/community-growth-history.json';
import { getRegionLabel, REGIONS } from '../utils/countryRegions';

const CATEGORIES = [
  { id: 'community-builders', label: 'Community Builders', shortLabel: 'Builders', color: '#35B858' },
  { id: 'heroes', label: 'AWS Heroes', shortLabel: 'Heroes', color: '#FF9900' },
  { id: 'user-groups', label: 'User Groups', shortLabel: 'User Groups', color: '#00A1C9' },
  { id: 'cloud-clubs', label: 'Student Builder Groups', shortLabel: 'Student Groups', color: '#E15262' },
  { id: 'community-days', label: 'Community Days', shortLabel: 'Community Days', color: '#FFB74D' },
  { id: 'kiro-events', label: 'Kiro Events', shortLabel: 'Kiro Events', color: '#8B7CF6' },
];

const EMPTY_REGIONS = Object.fromEntries(REGIONS.map((region) => [region.id, 0]));
const EMPTY_CHANGES = {
  added: 0,
  removed: 0,
  net: 0,
  retained: 0,
  addedByRegion: EMPTY_REGIONS,
  removedByRegion: EMPTY_REGIONS,
  addedItems: [],
  removedItems: [],
  quality: { confidence: 'baseline', comparable: false, reasons: ['No earlier comparable snapshot.'] },
};
const EMPTY_CATEGORY = {
  total: 0,
  classified: 0,
  unclassified: 0,
  coveragePercent: 0,
  regions: EMPTY_REGIONS,
  changes: EMPTY_CHANGES,
};

function formatDate(date, options = {}) {
  if (!date) return 'No date';
  const value = String(date).includes('T') ? date : `${date}T00:00:00Z`;
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: options.year === false ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatDelta(delta) {
  if (delta > 0) return `+${delta.toLocaleString()}`;
  return delta.toLocaleString();
}

function getDeltaClass(delta) {
  if (delta > 0) return 'is-up';
  if (delta < 0) return 'is-down';
  return 'is-flat';
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value || '');
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }) {
  const numberRef = useRef(null);
  const previousValue = useRef(0);

  useGSAP(() => {
    if (!numberRef.current) return undefined;
    const render = (nextValue) => {
      const formatted = decimals > 0
        ? Number(nextValue).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : Math.round(nextValue).toLocaleString();
      numberRef.current.dataset.value = `${prefix}${formatted}${suffix}`;
    };

    if (prefersReducedMotion()) {
      render(value);
      previousValue.current = value;
      return undefined;
    }

    const counter = { value: previousValue.current };
    const tween = gsap.to(counter, {
      value,
      duration: 0.72,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => render(counter.value),
      onComplete: () => render(value),
    });
    previousValue.current = value;
    return () => tween.kill();
  }, { dependencies: [value, prefix, suffix, decimals] });

  const initial = decimals > 0 ? Number(value).toFixed(decimals) : Math.round(value).toLocaleString();
  const displayValue = `${prefix}${initial}${suffix}`;
  return <span ref={numberRef} className="trends-animated-number" data-value={displayValue} aria-label={displayValue} />;
}

function TimelineChart({ points, color, categoryLabel, selectedDate, onSelectDate }) {
  const chartRef = useRef(null);
  const cursorRef = useRef(null);
  const previousCursorX = useRef(null);
  const width = 900;
  const height = 250;
  const padding = { top: 24, right: 22, bottom: 44, left: 56 };
  const values = points.map((point) => point.total);
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, rawMax - rawMin);
  const min = Math.max(0, rawMin - range * 0.12);
  const max = rawMax + range * 0.12;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const positioned = points.map((point, index) => ({
    ...point,
    x: padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: padding.top + ((max - point.total) / Math.max(1, max - min)) * plotHeight,
  }));
  const linePath = positioned.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = positioned.length
    ? `${linePath} L ${positioned.at(-1).x} ${padding.top + plotHeight} L ${positioned[0].x} ${padding.top + plotHeight} Z`
    : '';
  const middle = positioned[Math.floor((positioned.length - 1) / 2)];
  const axisPoints = positioned.length <= 2 ? positioned : [positioned[0], middle, positioned.at(-1)];
  const selectedPoint = positioned.find((point) => point.date === selectedDate);

  useGSAP(() => {
    if (!chartRef.current || positioned.length === 0) return undefined;
    const line = chartRef.current.querySelector('.trends-chart-line');
    const area = chartRef.current.querySelector('.trends-chart-area');
    const dots = chartRef.current.querySelectorAll('.trends-chart-point');
    if (!line) return undefined;

    if (prefersReducedMotion()) {
      gsap.set([line, area, dots], { clearProps: 'all' });
      return undefined;
    }

    const length = line.getTotalLength();
    const timeline = gsap.timeline();
    timeline
      .set(line, { strokeDasharray: length, strokeDashoffset: length })
      .fromTo(area, { opacity: 0, scaleX: 0.25, transformOrigin: 'left center' }, { opacity: 1, scaleX: 1, duration: 0.85, ease: 'power2.out' }, 0)
      .to(line, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' }, 0.05)
      .fromTo(dots, { scale: 0, opacity: 0, transformOrigin: 'center', transformBox: 'fill-box' }, { scale: 1, opacity: 1, duration: 0.35, stagger: 0.035, ease: 'back.out(2)' }, 0.42);
    return () => timeline.kill();
  }, { scope: chartRef, dependencies: [categoryLabel], revertOnUpdate: true });

  useGSAP(() => {
    if (!cursorRef.current || !selectedPoint) return undefined;
    const cursorDelta = previousCursorX.current === null ? 0 : previousCursorX.current - selectedPoint.x;
    previousCursorX.current = selectedPoint.x;

    if (prefersReducedMotion()) {
      gsap.set(cursorRef.current, { x: 0, opacity: 1 });
      return undefined;
    }

    const pulse = cursorRef.current.querySelector('.trends-chart-selected-pulse');
    const timeline = gsap.timeline();
    timeline.fromTo(cursorRef.current, { x: cursorDelta, opacity: 0.35 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' });
    const pulseTween = gsap.fromTo(pulse, { scale: 0.7, opacity: 0.8, transformOrigin: 'center', transformBox: 'fill-box' }, { scale: 2, opacity: 0, duration: 1.35, repeat: -1, ease: 'power1.out' });
    return () => {
      timeline.kill();
      pulseTween.kill();
    };
  }, { scope: chartRef, dependencies: [selectedPoint?.x, categoryLabel], revertOnUpdate: true });

  if (positioned.length === 0) {
    return <div className="trends-timeline-chart is-empty">This dataset was not tracked in the selected period.</div>;
  }

  return (
    <div className="trends-timeline-chart" ref={chartRef}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${categoryLabel} directory total over time`}>
        <defs>
          <linearGradient id="trends-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="trends-point-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight * ratio;
          const value = Math.round(max - (max - min) * ratio);
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="trends-chart-grid-line" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="trends-chart-axis-label">{value.toLocaleString()}</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#trends-area-gradient)" className="trends-chart-area" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="trends-chart-line" />
        {positioned.map((point) => {
          const confidence = point.quality?.confidence;
          const pointColor = confidence === 'low' ? '#FF7B72' : confidence === 'medium' ? '#FFD166' : color;
          const activate = () => onSelectDate(point.date);
          return (
            <g
              key={`${point.date}-${point.total}`}
              className={`trends-chart-point-control${point.date === selectedDate ? ' is-selected' : ''}`}
              role="button"
              tabIndex="0"
              aria-label={`Show ${formatDate(point.date)} snapshot with ${point.total.toLocaleString()} records`}
              onClick={activate}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate();
                }
              }}
            >
              <circle cx={point.x} cy={point.y} r="14" className="trends-chart-hit-target" />
              <circle cx={point.x} cy={point.y} r={confidence === 'low' ? 5.2 : 4} fill={pointColor} stroke="var(--trends-panel-bg)" strokeWidth="2" className="trends-chart-point">
                <title>{`${formatDate(point.date)}: ${point.total.toLocaleString()} records${confidence === 'low' ? ' · source discontinuity flagged' : ''}`}</title>
              </circle>
            </g>
          );
        })}
        {selectedPoint && (
          <g ref={cursorRef} className="trends-chart-selection" aria-hidden="true">
            <line x1={selectedPoint.x} x2={selectedPoint.x} y1={padding.top - 6} y2={padding.top + plotHeight + 5} />
            <circle cx={selectedPoint.x} cy={selectedPoint.y} r="9" fill="none" stroke={color} strokeWidth="2" filter="url(#trends-point-glow)" />
            <circle cx={selectedPoint.x} cy={selectedPoint.y} r="8" fill="none" stroke={color} strokeWidth="2" className="trends-chart-selected-pulse" />
          </g>
        )}
        {axisPoints.filter(Boolean).map((point, index) => (
          <text key={`axis-${point.date}-${index}`} x={point.x} y={height - 12} textAnchor={point === positioned[0] ? 'start' : point === positioned.at(-1) ? 'end' : 'middle'} className="trends-chart-axis-label">
            {formatDate(point.date, { year: false })}
          </text>
        ))}
      </svg>
    </div>
  );
}

function SnapshotNavigator({ snapshots, selectedIndex, onChange }) {
  const snapshot = snapshots[selectedIndex];
  const progress = snapshots.length > 1 ? (selectedIndex / (snapshots.length - 1)) * 100 : 100;
  const sourceLabel = snapshot.source?.type === 'working-tree'
    ? 'Current working tree'
    : snapshot.source?.subject || 'Git snapshot';

  return (
    <section className="trends-snapshot-explorer" aria-labelledby="snapshot-explorer-title">
      <div className="trends-snapshot-copy">
        <span className="regional-trends-eyebrow">Time machine</span>
        <h2 id="snapshot-explorer-title">Explore every saved snapshot</h2>
        <p>Drag through history or use the arrows. Every metric, region, and change feed updates to that moment.</p>
      </div>
      <div className="trends-snapshot-control">
        <div className="trends-snapshot-current" key={snapshot.date}>
          <span>Snapshot {selectedIndex + 1} of {snapshots.length}</span>
          <strong>{formatDate(snapshot.date)}</strong>
          <small>{sourceLabel}</small>
        </div>
        <div className="trends-snapshot-slider-row">
          <button type="button" aria-label="Previous snapshot" disabled={selectedIndex === 0} onClick={() => onChange(selectedIndex - 1)}>←</button>
          <input
            type="range"
            min="0"
            max={snapshots.length - 1}
            step="1"
            value={selectedIndex}
            aria-label="Select historical snapshot"
            style={{ '--snapshot-progress': `${progress}%` }}
            onInput={(event) => onChange(Number(event.currentTarget.value))}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <button type="button" aria-label="Next snapshot" disabled={selectedIndex === snapshots.length - 1} onClick={() => onChange(selectedIndex + 1)}>→</button>
        </div>
        <div className="trends-snapshot-range-labels" aria-hidden="true">
          <span>{formatDate(snapshots[0].date, { year: false })}</span>
          <button type="button" disabled={selectedIndex === snapshots.length - 1} onClick={() => onChange(snapshots.length - 1)}>Jump to latest</button>
          <span>{formatDate(snapshots.at(-1).date, { year: false })}</span>
        </div>
      </div>
    </section>
  );
}

function ChangeItem({ item, type }) {
  const content = (
    <>
      <span className={`trends-change-symbol is-${type}`} aria-hidden="true">{type === 'added' ? '+' : '−'}</span>
      <span>
        <strong>{item.name}</strong>
        <small>{item.location}</small>
      </span>
    </>
  );
  if (!isExternalUrl(item.url)) return <div className="trends-change-item">{content}</div>;
  return <a className="trends-change-item" href={item.url} target="_blank" rel="noopener noreferrer">{content}</a>;
}

function EventItem({ event }) {
  const date = new Date(event.date);
  const dateBadge = (
    <span className="trends-event-date" aria-hidden="true">
      <small>{new Intl.DateTimeFormat('en-SG', { month: 'short', timeZone: 'UTC' }).format(date)}</small>
      <strong>{new Intl.DateTimeFormat('en-SG', { day: '2-digit', timeZone: 'UTC' }).format(date)}</strong>
    </span>
  );
  const content = (
    <>
      {dateBadge}
      <span className="trends-event-copy">
        <strong>{event.name}</strong>
        <small>{event.location} · {event.category === 'community-days' ? 'Community Day' : 'Kiro'}</small>
      </span>
    </>
  );
  if (!isExternalUrl(event.url)) return <div className="trends-event-item">{content}</div>;
  return <a className="trends-event-item" href={event.url} target="_blank" rel="noopener noreferrer">{content}</a>;
}

export default function TrendsDashboard({ darkMode }) {
  const dashboardRef = useRef(null);
  const snapshots = growthHistory.snapshots;
  const analytics = growthHistory.analytics;
  const [selectedCategory, setSelectedCategory] = useState('community-builders');
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(Math.max(0, snapshots.length - 1));
  const category = CATEGORIES.find((entry) => entry.id === selectedCategory) ?? CATEGORIES[0];
  const selectedSnapshot = snapshots[selectedSnapshotIndex];
  const previousSnapshot = snapshots[selectedSnapshotIndex - 1] ?? null;
  const categoryData = selectedSnapshot?.categories?.[selectedCategory] ?? EMPTY_CATEGORY;
  const previousCategoryData = previousSnapshot?.categories?.[selectedCategory] ?? EMPTY_CATEGORY;
  const snapshotChanges = categoryData.changes ?? EMPTY_CHANGES;
  const snapshotHasComparison = Boolean(previousSnapshot && previousCategoryData.total > 0 && snapshotChanges.quality?.confidence !== 'baseline');
  const selectedGlobal = CATEGORIES.reduce((result, entry) => {
    const data = selectedSnapshot?.categories?.[entry.id] ?? EMPTY_CATEGORY;
    result.total += data.total;
    result.classified += data.classified;
    if (data.total > 0) result.tracked += 1;
    return result;
  }, { total: 0, classified: 0, tracked: 0 });
  const selectedGlobalCoverage = selectedGlobal.total ? Math.round((selectedGlobal.classified / selectedGlobal.total) * 1000) / 10 : 0;
  const retentionPercent = previousCategoryData.total > 0
    ? Math.round((snapshotChanges.retained / previousCategoryData.total) * 1000) / 10
    : null;

  const series = useMemo(() => (
    snapshots
      .map((snapshot, snapshotIndex) => ({
        date: snapshot.date,
        snapshotIndex,
        total: snapshot.categories?.[selectedCategory]?.total ?? 0,
        quality: snapshot.categories?.[selectedCategory]?.changes?.quality,
      }))
      .filter((snapshot) => snapshot.total > 0)
  ), [selectedCategory, snapshots]);

  const selectedSeries = series.filter((point) => point.snapshotIndex <= selectedSnapshotIndex);
  const peak = selectedSeries.reduce((best, point) => (point.total > best.total ? point : best), { total: 0, date: null });
  const regionRows = REGIONS.map((region) => {
    const current = categoryData.regions?.[region.id] ?? 0;
    const previous = previousCategoryData.regions?.[region.id] ?? 0;
    const net = current - previous;
    return {
      ...region,
      current,
      previous,
      net,
      growthPercent: previous > 0 ? Math.round((net / previous) * 1000) / 10 : current > 0 ? null : 0,
      added: snapshotChanges.addedByRegion?.[region.id] ?? 0,
      removed: snapshotChanges.removedByRegion?.[region.id] ?? 0,
    };
  }).sort((left, right) => right.net - left.net || right.current - left.current);
  const maxRegionCurrent = Math.max(...regionRows.map((region) => region.current), 1);
  const growthLeader = regionRows.find((region) => region.net > 0) ?? null;
  const fastestRateRegion = regionRows
    .filter((region) => region.growthPercent !== null && region.growthPercent > 0)
    .sort((left, right) => right.growthPercent - left.growthPercent)[0] ?? null;
  const recentAdded = snapshotChanges.addedItems?.slice(0, 5) ?? [];
  const recentRemoved = snapshotChanges.removedItems?.slice(0, 5) ?? [];
  const upcomingRegion = Object.entries(analytics.upcoming.byRegion)
    .sort((left, right) => right[1] - left[1])[0];
  const selectedQuality = snapshotChanges.quality ?? EMPTY_CHANGES.quality;
  const snapshotIsLatest = selectedSnapshotIndex === snapshots.length - 1;

  useGSAP(() => {
    if (!dashboardRef.current || prefersReducedMotion()) return undefined;
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    timeline
      .fromTo('.trends-dashboard-header > *', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62, stagger: 0.08 })
      .fromTo('.trends-snapshot-explorer', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, '-=0.3')
      .fromTo('.trends-category-card', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.05 }, '-=0.28');
    return () => timeline.kill();
  }, { scope: dashboardRef });

  useGSAP(() => {
    if (!dashboardRef.current || prefersReducedMotion()) return undefined;
    const kpis = dashboardRef.current.querySelectorAll('.trends-kpi-card');
    const regions = dashboardRef.current.querySelectorAll('.trends-region-row');
    const timeline = gsap.timeline({ defaults: { overwrite: true } });
    timeline
      .fromTo(kpis, { y: 12, opacity: 0.35 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.045, ease: 'power2.out' })
      .fromTo(regions, { x: -10, opacity: 0.3 }, { x: 0, opacity: 1, duration: 0.34, stagger: 0.035, ease: 'power2.out' }, 0.08);
    return () => timeline.kill();
  }, { scope: dashboardRef, dependencies: [selectedCategory, selectedSnapshotIndex], revertOnUpdate: true });

  const selectSnapshotDate = (date) => {
    const nextIndex = snapshots.findIndex((snapshot) => snapshot.date === date);
    if (nextIndex >= 0) setSelectedSnapshotIndex(nextIndex);
  };

  return (
    <main
      ref={dashboardRef}
      className="regional-trends-panel trends-dashboard insights-dashboard"
      style={{
        '--trends-accent': category.color,
        '--trends-panel-bg': darkMode ? '#08141E' : '#EEF6FC',
        '--trends-panel-surface': darkMode ? 'rgba(20, 40, 55, 0.82)' : 'rgba(255, 255, 255, 0.88)',
        '--trends-panel-surface-strong': darkMode ? '#142B3D' : '#FFFFFF',
        '--trends-panel-border': darkMode ? 'rgba(100, 141, 173, 0.25)' : 'rgba(135, 170, 198, 0.42)',
        '--trends-panel-text': darkMode ? '#F2F7FA' : '#102A40',
        '--trends-panel-muted': darkMode ? '#8EA5B7' : '#617F98',
        '--trends-panel-faint': darkMode ? '#5D7486' : '#7793AA',
      }}
    >
      <div className="insights-ambient insights-ambient-one" aria-hidden="true" />
      <div className="insights-ambient insights-ambient-two" aria-hidden="true" />
      <header className="regional-trends-header trends-dashboard-header">
        <div>
          <span className="regional-trends-eyebrow">Community intelligence</span>
          <h1>Community insights</h1>
          <p>Move through the project’s history to see directory growth, identity movement, regional momentum, and upcoming activity.</p>
        </div>
        <div className="trends-dashboard-status" aria-label={`Snapshot ${selectedSnapshotIndex + 1} of ${snapshots.length}`} key={selectedSnapshot.date}>
          <span><i aria-hidden="true" /> Snapshot {selectedSnapshotIndex + 1} of {snapshots.length}</span>
          <strong>{formatDate(selectedSnapshot.date)}</strong>
        </div>
      </header>

      <div className="regional-trends-content trends-dashboard-content">
        <SnapshotNavigator snapshots={snapshots} selectedIndex={selectedSnapshotIndex} onChange={setSelectedSnapshotIndex} />

        <section className="trends-dashboard-overview" aria-labelledby="trends-overview-title">
          <div className="trends-dashboard-section-heading">
            <div>
              <span>{snapshotIsLatest ? 'Latest snapshot' : 'Historical snapshot'}</span>
              <h2 id="trends-overview-title">What we tracked on {formatDate(selectedSnapshot.date, { year: false })}</h2>
            </div>
            <p><AnimatedNumber value={selectedGlobal.total} /> records · {selectedGlobalCoverage}% region mapped · {selectedGlobal.tracked}/6 datasets active</p>
          </div>

          <div className="trends-category-grid">
            {CATEGORIES.map((entry) => {
              const data = selectedSnapshot.categories?.[entry.id] ?? EMPTY_CATEGORY;
              const changes = data.changes ?? EMPTY_CHANGES;
              const selected = entry.id === selectedCategory;
              const previousData = previousSnapshot?.categories?.[entry.id] ?? EMPTY_CATEGORY;
              const hasComparison = previousData.total > 0 && changes.quality?.confidence !== 'baseline';
              return (
                <button
                  type="button"
                  key={entry.id}
                  className={`trends-category-card${selected ? ' is-selected' : ''}`}
                  style={{ '--category-color': entry.color }}
                  aria-pressed={selected}
                  onClick={() => setSelectedCategory(entry.id)}
                >
                  <span className="trends-category-dot" aria-hidden="true" />
                  <span className="trends-category-label">{entry.shortLabel}</span>
                  <strong><AnimatedNumber value={data.total} /></strong>
                  <small>{data.total > 0 ? `${data.coveragePercent}% mapped` : 'Not tracked yet'}</small>
                  <span className={`trends-category-delta ${hasComparison ? getDeltaClass(changes.net) : 'is-flat'}`}>
                    {hasComparison ? `${formatDelta(changes.net)} vs prior snapshot` : 'Baseline snapshot'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="trends-dashboard-detail" aria-labelledby="trends-detail-title">
          <div className="trends-dashboard-section-heading">
            <div>
              <span>Selected dataset</span>
              <h2 id="trends-detail-title">{category.label}</h2>
            </div>
            <p>{snapshotHasComparison ? `Compared with ${formatDate(previousSnapshot?.date)}` : 'First tracked snapshot'}</p>
          </div>

          <div className="trends-kpi-grid">
            <article className="trends-kpi-card is-primary">
              <span>Snapshot total</span>
              <strong><AnimatedNumber value={categoryData.total} /></strong>
              <small>{categoryData.total > 0 ? `${categoryData.coveragePercent}% assigned to a region` : 'Dataset unavailable at this point'}</small>
            </article>
            <article className="trends-kpi-card">
              <span>Change from previous</span>
              <strong className={snapshotHasComparison ? getDeltaClass(snapshotChanges.net) : 'is-flat'}>
                {snapshotHasComparison ? <AnimatedNumber value={Math.abs(snapshotChanges.net)} prefix={snapshotChanges.net > 0 ? '+' : snapshotChanges.net < 0 ? '−' : ''} /> : '—'}
              </strong>
              <small>{snapshotHasComparison ? `${previousCategoryData.total.toLocaleString()} in the prior snapshot` : 'No earlier comparison available'}</small>
            </article>
            <article className="trends-kpi-card">
              <span>Identity movement</span>
              <strong><em>+<AnimatedNumber value={snapshotChanges.added} /></em> <b>−<AnimatedNumber value={snapshotChanges.removed} /></b></strong>
              <small>Observed additions and removals in this snapshot</small>
            </article>
            <article className="trends-kpi-card">
              <span>Record continuity</span>
              <strong>{retentionPercent === null ? '—' : <AnimatedNumber value={retentionPercent} suffix="%" decimals={1} />}</strong>
              <small>{snapshotChanges.retained.toLocaleString()} prior identities retained</small>
            </article>
          </div>
        </section>

        <section className="trends-timeline-card" aria-labelledby="timeline-title">
          <div className="trends-dashboard-section-heading">
            <div>
              <span>Animated trajectory</span>
              <h2 id="timeline-title">Directory size over time</h2>
            </div>
            <div className="trends-chart-legend">
              <span><i className="is-stable" /> Stable snapshot</span>
              <span><i className="is-caution" /> Coverage change</span>
              <span><i className="is-discontinuity" /> Source discontinuity</span>
            </div>
          </div>
          <TimelineChart points={series} color={category.color} categoryLabel={category.label} selectedDate={selectedSnapshot.date} onSelectDate={selectSnapshotDate} />
          <div className="trends-timeline-insights">
            <span><small>Peak through this snapshot</small><strong>{peak.total.toLocaleString()}</strong><em>{peak.date ? formatDate(peak.date) : 'Not tracked yet'}</em></span>
            <span><small>Largest region gain</small><strong>{growthLeader ? getRegionLabel(growthLeader.id) : 'No positive growth'}</strong><em>{growthLeader ? `${formatDelta(growthLeader.net)} records` : 'In this comparison'}</em></span>
            <span><small>Fastest percentage growth</small><strong>{fastestRateRegion?.label ?? 'Not available'}</strong><em>{fastestRateRegion ? `${formatDelta(fastestRateRegion.growthPercent)}%` : 'No positive growth'}</em></span>
          </div>
          <p className="trends-chart-hint">Tip: select any point on the graph to jump directly to that snapshot.</p>
        </section>

        <div className="trends-analysis-grid">
          <section className="trends-region-leaderboard" aria-labelledby="region-leaderboard-title">
            <div className="trends-dashboard-section-heading">
              <div>
                <span>Regional movement</span>
                <h2 id="region-leaderboard-title">Where change happened</h2>
              </div>
              <p>{snapshotHasComparison ? 'Versus prior snapshot' : 'Snapshot baseline'}</p>
            </div>
            <div className="trends-region-table">
              {regionRows.map((region, index) => (
                <article key={region.id} className="trends-region-row">
                  <span className="trends-region-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span className="trends-region-main">
                    <strong>{region.label}</strong>
                    <i><b style={{ width: `${(region.current / maxRegionCurrent) * 100}%` }} /></i>
                    <small>+{region.added.toLocaleString()} observed · −{region.removed.toLocaleString()} missing</small>
                  </span>
                  <span className="trends-region-total"><strong>{region.current.toLocaleString()}</strong><small>snapshot</small></span>
                  <span className={`trends-region-net ${getDeltaClass(region.net)}`}><strong>{formatDelta(region.net)}</strong><small>{region.growthPercent === null ? 'new' : `${formatDelta(region.growthPercent)}%`}</small></span>
                </article>
              ))}
            </div>
          </section>

          <section className="trends-change-feed" aria-labelledby="change-feed-title">
            <div className="trends-dashboard-section-heading">
              <div>
                <span>Snapshot movement</span>
                <h2 id="change-feed-title">What changed here</h2>
              </div>
              <p>{formatDate(selectedSnapshot.date)}</p>
            </div>
            {snapshotHasComparison ? (
              <>
                <div className="trends-change-summary">
                  <span className="is-up">+{snapshotChanges.added.toLocaleString()} added</span>
                  <span className="is-down">−{snapshotChanges.removed.toLocaleString()} removed</span>
                  <small>{selectedQuality.confidence === 'high' ? 'Stable comparison' : `${selectedQuality.confidence} confidence`}</small>
                </div>
                <div className="trends-change-columns">
                  <div>
                    <h3>Newly observed</h3>
                    {recentAdded.length > 0 ? recentAdded.map((item) => <ChangeItem key={`added-${item.name}-${item.location}`} item={item} type="added" />) : <p>No new records in this snapshot.</p>}
                  </div>
                  <div>
                    <h3>No longer present</h3>
                    {recentRemoved.length > 0 ? recentRemoved.map((item) => <ChangeItem key={`removed-${item.name}-${item.location}`} item={item} type="removed" />) : <p>No removals in this snapshot.</p>}
                  </div>
                </div>
              </>
            ) : <p className="trends-empty-copy">This is the first comparable state for this dataset, so movement starts with the next snapshot.</p>}
          </section>
        </div>

        <section className="trends-upcoming-section" aria-labelledby="upcoming-title">
          <div className="trends-upcoming-summary">
            <span className="regional-trends-eyebrow">Forward signal · latest data</span>
            <strong><AnimatedNumber value={analytics.upcoming.total} /></strong>
            <h2 id="upcoming-title">Upcoming events tracked</h2>
            <p>{analytics.upcoming.next30Days} happen in the next 30 days. {upcomingRegion ? `${getRegionLabel(upcomingRegion[0])} has the largest mapped pipeline with ${upcomingRegion[1]}.` : ''}</p>
          </div>
          <div className="trends-upcoming-list">
            {analytics.upcoming.items.slice(0, 6).map((event) => <EventItem key={`${event.category}-${event.name}-${event.date}`} event={event} />)}
          </div>
        </section>

        <section className="trends-quality-section" aria-labelledby="quality-title">
          <div className="trends-quality-copy">
            <span className="regional-trends-eyebrow">Snapshot confidence</span>
            <h2 id="quality-title">Observed change, not verified membership churn</h2>
            <p>Git snapshots capture what the public source and scraper returned. Directory migrations, missing locations, and source redesigns can look like sudden growth or loss.</p>
          </div>
          <div className="trends-quality-flags">
            {(selectedQuality.reasons?.length ? selectedQuality.reasons : ['No quality note was recorded.']).slice(0, 3).map((reason, index) => (
              <article key={`${selectedSnapshot.date}-${index}`}>
                <span className={`is-${selectedQuality.confidence}`}>{selectedQuality.confidence}</span>
                <strong>{formatDate(selectedSnapshot.date)}</strong>
                <p>{reason}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="regional-trends-footnote trends-dashboard-footnote">
          Identity comparisons use stable public profile IDs or normalized names. Cloud Club and Student Builder Group names are normalized across the program rename. Selectors animate the saved JSON snapshots without changing the underlying data.
        </footer>
      </div>
    </main>
  );
}
