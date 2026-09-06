import { useMemo, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, CaretDownIcon } from '@phosphor-icons/react';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldAtlas from 'world-atlas/countries-110m.json';
import growthHistory from '../data/community-growth-history.json';
import { getRegionForCountry, REGIONS } from '../utils/countryRegions';
import './TrendsDashboard.css';
import AddToCalendar from './AddToCalendar';
import { getMonthlySnapshots } from '../utils/monthlySnapshots';

const DIRECTORIES = [
  { id: 'community-builders', label: 'Community Builders', short: 'Builders' },
  { id: 'heroes', label: 'AWS Heroes', short: 'Heroes' },
  { id: 'user-groups', label: 'User Groups', short: 'User groups' },
  { id: 'cloud-clubs', label: 'Student Builder Groups', short: 'Student groups' },
];
const DATASETS = [
  { id: 'all', label: 'Core community', short: 'The whole community' },
  ...DIRECTORIES,
  { id: 'community-days', label: 'Community Days', short: 'Community Days' },
  { id: 'kiro-events', label: 'Kiro Events', short: 'Kiro events' },
];
const ZERO_REGIONS = Object.fromEntries(REGIONS.map(({ id }) => [id, 0]));
const BASELINE = { confidence: 'baseline', comparable: false, reasons: ['No earlier comparison is available.'] };
const EMPTY_DATA = {
  total: 0, classified: 0, unclassified: 0, coveragePercent: 0, regions: ZERO_REGIONS,
  changes: { added: 0, removed: 0, retained: 0, net: 0, addedItems: [], removedItems: [], quality: BASELINE },
};
const REGION_CENTERS = { 'north-america': [-107, 40], 'south-america': [-61, -15], europe: [18, 51], asia: [103, 34], africa: [21, 1], oceania: [136, -25] };
const formatNumber = (value) => Number(value || 0).toLocaleString('en-SG');
const formatAxis = (value) => value >= 1000 ? `${Number(value / 1000).toLocaleString('en-SG', { maximumFractionDigits: 1 })}k` : formatNumber(value);
const formatDelta = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
const deltaClass = (value) => value > 0 ? 'obs-positive' : value < 0 ? 'obs-negative' : 'obs-neutral';
const externalUrl = (value) => /^https?:\/\//i.test(value || '');
const percent = (part, total) => total > 0 ? Math.round(part / total * 1000) / 10 : 0;

function formatDate(date, year = true) {
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' })
    .format(new Date(String(date).includes('T') ? date : `${date}T00:00:00Z`));
}

function getData(snapshot, category) {
  if (category !== 'all') return snapshot?.categories?.[category] ?? EMPTY_DATA;
  const datasets = DIRECTORIES.map((entry) => ({ ...entry, data: snapshot?.categories?.[entry.id] ?? EMPTY_DATA }));
  const result = datasets.reduce((sum, { label, data }) => {
    sum.total += data.total;
    sum.classified += data.classified;
    sum.unclassified += data.unclassified;
    for (const { id } of REGIONS) sum.regions[id] += data.regions?.[id] ?? 0;
    for (const key of ['added', 'removed', 'retained', 'net']) sum.changes[key] += data.changes?.[key] ?? 0;
    for (const key of ['addedItems', 'removedItems']) sum.changes[key].push(...(data.changes?.[key] ?? []).map((item) => ({ ...item, directory: label })));
    return sum;
  }, { total: 0, classified: 0, unclassified: 0, regions: { ...ZERO_REGIONS }, changes: { added: 0, removed: 0, retained: 0, net: 0, addedItems: [], removedItems: [] } });
  const confidence = ['low', 'medium', 'baseline', 'high'].find((value) => datasets.some(({ data }) => data.changes?.quality?.confidence === value)) ?? 'baseline';
  const reasons = datasets.flatMap(({ label, data }) => (data.changes?.quality?.confidence === confidence ? (data.changes.quality.reasons ?? []).map((reason) => `${label}: ${reason}`) : []));
  result.coveragePercent = percent(result.classified, result.total);
  result.changes.quality = { confidence, comparable: confidence === 'high' || confidence === 'medium', reasons };
  return result;
}

// Geography and saved series are prepared once; the atlas needs no render loop.
const landFeatures = feature(worldAtlas, worldAtlas.objects.countries).features.filter((country) => String(country.id) !== '010');
const projection = geoNaturalEarth1().fitExtent([[16, 26], [884, 435]], { type: 'FeatureCollection', features: landFeatures });
const mapPath = geoPath(projection);
const LAND = landFeatures.map((country) => ({ id: country.id, region: getRegionForCountry(country.properties.name), path: mapPath(country) }));
const GRATICULE = mapPath(geoGraticule10());
const SNAPSHOTS = growthHistory.snapshots;
const MONTHLY_SNAPSHOTS = getMonthlySnapshots(SNAPSHOTS);
const SERIES = Object.fromEntries(DATASETS.map(({ id }) => {
  const all = SNAPSHOTS.map((snapshot, index) => ({ date: snapshot.date, index, ...getData(snapshot, id) }));
  const first = all.findIndex(({ total }) => total > 0);
  return [id, first < 0 ? [] : all.slice(first)];
}));

function WorldMap({ data, regionRows, selectedRegion, onSelectRegion }) {
  const max = Math.max(...regionRows.map(({ current }) => current), 1);
  const selected = regionRows.find(({ id }) => id === selectedRegion);
  return (
    <div className="obs-atlas">
      <div className="obs-atlas-heading"><span><b>01</b> The global picture</span><span>Choose a region <ArrowUpRightIcon size={13} /></span></div>
      <svg className="obs-world-map" viewBox="0 0 900 475" aria-label="World map with six selectable regional directory totals">
        <defs>
          <pattern id="obs-land-dots" patternUnits="userSpaceOnUse" width="4" height="4"><circle cx="2" cy="2" r="0.9" fill="var(--obs-map-dot)" /></pattern>
          <pattern id="obs-selected-dots" patternUnits="userSpaceOnUse" width="4" height="4"><circle cx="2" cy="2" r="1" fill="var(--obs-accent)" /></pattern>
        </defs>
        <path d={GRATICULE} className="obs-map-grid" aria-hidden="true" />
        <g aria-hidden="true">{LAND.map((country) => <path key={country.id} d={country.path} className={`obs-land${country.region === selectedRegion ? ' obs-land-selected' : ''}`} />)}</g>
        {regionRows.map((region) => {
          const [x, y] = projection(REGION_CENTERS[region.id]);
          const radius = region.current > 0 ? Math.max(4, Math.sqrt(region.current / max) * 20) : 0;
          const active = region.id === selectedRegion;
          const labelY = region.id === 'europe' ? -34 : 38;
          return (
            <g key={region.id} transform={`translate(${x},${y})`} className={`obs-map-marker${active ? ' obs-map-marker-active' : ''}`} role="button" tabIndex={0} aria-pressed={active} aria-label={`${region.label}, ${formatNumber(region.current)} records, ${percent(region.current, data.total)} percent of selected dataset`} onClick={() => onSelectRegion(region.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectRegion(region.id); } }}>
              <circle r="27" className="obs-marker-hit" />
              <circle r={Math.max(radius, 4) + 7} className="obs-marker-ring" />
              {radius > 0 && <circle r={radius} className="obs-marker-disc" />}
              <circle r="3" className="obs-marker-center" />
              <text y={labelY} className="obs-marker-label">{region.label}</text>
              <text y={labelY + 17} className="obs-marker-value">{formatNumber(region.current)}</text>
            </g>
          );
        })}
      </svg>
      <div className="obs-map-footer"><div className="obs-map-selection"><span className="obs-crosshair" aria-hidden="true">+</span><div><span>{selected?.label ?? 'Select a region'}</span><strong>{selected ? `${percent(selected.current, data.total)}% of this dataset` : 'Explore regional totals'}</strong></div></div><p>Circles compare regional totals.<br />Locations are regional, not individual.</p></div>
    </div>
  );
}

function HistoryChart({ points, selectedIndex, onSelect, label }) {
  if (!points.length) return <div className="obs-empty">No saved observations for this directory yet.</div>;
  const left = 62;
  const right = 800;
  const top = 36;
  const bottom = 235;
  const max = Math.max(...points.map(({ total }) => total), 1);
  const power = 10 ** Math.floor(Math.log10(max));
  const ceiling = Math.ceil(max / power / 2) * power * 2;
  const start = Date.parse(points[0].date);
  const end = Date.parse(points.at(-1).date);
  const plot = points.map((point) => ({ ...point, x: left + (Date.parse(point.date) - start) / Math.max(end - start, 1) * (right - left), y: bottom - point.total / ceiling * (bottom - top) }));
  const line = plot.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  const area = `${line} L${plot.at(-1).x},${bottom} L${plot[0].x},${bottom} Z`;
  const selected = plot.find(({ index }) => index === selectedIndex);
  const labelX = selected ? Math.max(88, Math.min(right - 50, selected.x)) : 0;
  const labelY = selected ? Math.max(5, selected.y - 36) : 0;
  return (
    <div className="obs-history-plot">
      <svg viewBox="0 0 820 275" aria-label={`${label} history. Time runs left to right; totals start at zero.`}>
        <defs><linearGradient id="obs-history-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--obs-accent)" stopOpacity="0.24" /><stop offset="100%" stopColor="var(--obs-accent)" stopOpacity="0" /></linearGradient></defs>
        {[0, 0.5, 1].map((fraction) => <g key={fraction} aria-hidden="true"><line x1={left} x2={right} y1={bottom - fraction * (bottom - top)} y2={bottom - fraction * (bottom - top)} className="obs-chart-grid" /><text x={left - 12} y={bottom - fraction * (bottom - top) + 4} textAnchor="end" className="obs-chart-axis">{formatAxis(ceiling * fraction)}</text></g>)}
        <path d={area} fill="url(#obs-history-fill)" aria-hidden="true" /><path d={line} className="obs-chart-line" aria-hidden="true" />
        {selected && <line x1={selected.x} x2={selected.x} y1={top} y2={bottom} className="obs-chart-guide" aria-hidden="true" />}
        {plot.map((point) => <g key={point.date} className={`obs-chart-point${point.index === selectedIndex ? ' obs-chart-point-active' : ''}${point.changes.quality?.confidence === 'low' ? ' obs-chart-point-caution' : ''}`} role="button" tabIndex={0} aria-pressed={point.index === selectedIndex} aria-label={`${formatDate(point.date)}, ${formatNumber(point.total)} records, ${point.changes.quality?.confidence ?? 'baseline'} confidence`} onClick={() => onSelect(point.index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point.index); } }}><title>{formatDate(point.date)} · {formatNumber(point.total)} records</title><circle cx={point.x} cy={point.y} r="10" className="obs-chart-hit" /><circle cx={point.x} cy={point.y} r="3.6" className="obs-chart-dot" /></g>)}
        {selected && <g className="obs-chart-callout" aria-hidden="true" pointerEvents="none"><rect x={labelX - 40} y={labelY} width="80" height="26" rx="4" /><text x={labelX} y={labelY + 17} textAnchor="middle">{formatNumber(selected.total)}</text></g>}
        <text x={left} y="263" className="obs-chart-axis">{formatDate(points[0].date, false)}</text>
        {points.length > 2 && <text x={(left + right) / 2} y="263" textAnchor="middle" className="obs-chart-axis">{formatDate(new Date((start + end) / 2).toISOString(), false)}</text>}
        {points.length > 1 && <text x={right} y="263" textAnchor="end" className="obs-chart-axis">{formatDate(points.at(-1).date, false)}</text>}
      </svg>
      {!selected && <p className="obs-chart-untracked">This directory was not yet tracked on the selected date. Choose a later observation to explore it.</p>}
      <div className="obs-chart-caption"><span><i /> Saved observations <b className="obs-caution-dot" /> Source discontinuity</span><span>Select any point to travel through time</span></div>
    </div>
  );
}

function ChangeList({ title, items, total, kind, expanded }) {
  const visible = items.slice(0, expanded ? undefined : 5);
  return <div className="obs-change-list"><h3><span>{title}</span><strong>{kind === 'added' ? '+' : '−'}{formatNumber(total)}</strong></h3>{visible.length ? visible.map((item, index) => {
    const content = <><span><strong>{item.name}</strong><small>{[item.directory, item.location].filter(Boolean).join(' · ')}</small></span>{externalUrl(item.url) && <ArrowUpRightIcon size={15} />}</>;
    return externalUrl(item.url) ? <a key={`${item.name}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer">{content}</a> : <div key={`${item.name}-${index}`} className="obs-change-person">{content}</div>;
  }) : <p>No {kind === 'added' ? 'new' : 'missing'} identities in this snapshot.</p>}{visible.length > 0 && <small className="obs-sample-note">Showing {visible.length} of {formatNumber(total)} observed identities. Saved samples may be incomplete.</small>}</div>;
}

function EventLink({ event }) {
  const date = new Date(event.date);
  const content = <><time className="obs-event-date" dateTime={event.date}><span>{new Intl.DateTimeFormat('en-SG', { month: 'short', timeZone: 'UTC' }).format(date)}</span><strong>{new Intl.DateTimeFormat('en-SG', { day: '2-digit', timeZone: 'UTC' }).format(date)}</strong></time><span className="obs-event-description"><small>{event.category === 'community-days' ? 'Community Day' : 'Kiro event'}</small><strong>{event.name.replace(/^AWS Community Day\s*/i, '')}</strong><span>{event.location}</span></span>{externalUrl(event.url) && <ArrowUpRightIcon size={19} />}</>;
  return <div className="obs-event-entry">{externalUrl(event.url) ? <a className="obs-event" href={event.url} target="_blank" rel="noopener noreferrer">{content}</a> : <div className="obs-event">{content}</div>}<AddToCalendar event={event} /></div>;
}

export default function TrendsDashboard({ darkMode = true }) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, SNAPSHOTS.length - 1));
  const [categoryId, setCategoryId] = useState('all');
  const [regionId, setRegionId] = useState('asia');
  const [regionSort, setRegionSort] = useState('total');
  const [expandedChanges, setExpandedChanges] = useState(null);
  const snapshot = SNAPSHOTS[selectedIndex];
  const previousSnapshot = SNAPSHOTS[selectedIndex - 1];
  const category = DATASETS.find(({ id }) => id === categoryId);
  const data = useMemo(() => getData(snapshot, categoryId), [snapshot, categoryId]);
  const previous = useMemo(() => getData(previousSnapshot, categoryId), [previousSnapshot, categoryId]);
  const changes = data.changes ?? EMPTY_DATA.changes;
  const quality = changes.quality ?? BASELINE;
  const hasComparison = Boolean(previousSnapshot && previous.total > 0 && quality.confidence !== 'baseline');
  const caution = hasComparison && quality.comparable === false;
  const coverageChanged = hasComparison && Math.abs(data.coveragePercent - previous.coveragePercent) >= 5;
  const points = SERIES[categoryId];
  const peak = points.filter(({ index }) => index <= selectedIndex).reduce((best, point) => point.total > best.total ? point : best, { total: 0, date: null });
  const regions = REGIONS.map((region) => {
    const current = data.regions?.[region.id] ?? 0;
    const before = previous.regions?.[region.id] ?? 0;
    return { ...region, current, before, net: hasComparison ? current - before : 0 };
  });
  const sortedRegions = [...regions].sort((a, b) => regionSort === 'change' ? b.net - a.net || b.current - a.current : b.current - a.current);
  const regionCount = regions.filter(({ current }) => current > 0).length;
  const selectedRegion = regions.find(({ id }) => id === regionId);
  const isLatest = selectedIndex === SNAPSHOTS.length - 1;
  const changesKey = `${snapshot.date}-${categoryId}`;
  const showAllChanges = expandedChanges === changesKey;
  const upcoming = growthHistory.analytics.upcoming;
  const latestDate = SNAPSHOTS.at(-1).date;
  const previousLabel = previousSnapshot ? formatDate(previousSnapshot.date, false) : 'No previous snapshot';
  const selectedMonth = snapshot.date.slice(0, 7);
  const monthIndex = MONTHLY_SNAPSHOTS.findIndex(({ month }) => month === selectedMonth);

  return (
    <main className={`community-observatory${darkMode ? '' : ' community-observatory-light'}`} aria-label="AWS community analytics">
      <div className="obs-page">
        <header className="obs-masthead">
          <a className="obs-wordmark" href="#obs-global"><span className="obs-wordmark-symbol" aria-hidden="true">◎</span><span>Community <strong>observatory</strong></span></a>
          <div className="obs-date-control">
            <span className="obs-date-status" id="obs-selected-date"><i /> {formatDate(snapshot.date)}{isLatest ? ' · Latest' : ''}</span>
            <div className="obs-date-buttons">
              <button type="button" aria-label="Previous month" disabled={monthIndex === 0} onClick={() => setSelectedIndex(MONTHLY_SNAPSHOTS[monthIndex - 1].index)}><ArrowLeftIcon size={15} /></button>
              <select aria-label="Choose snapshot month" aria-describedby="obs-selected-date" title="Latest saved day in each month. Choose chart points for other dates." value={selectedMonth} onChange={(event) => setSelectedIndex(MONTHLY_SNAPSHOTS.find(({ month }) => month === event.target.value).index)}>
                {MONTHLY_SNAPSHOTS.map(({ month, date }) => <option key={month} value={month}>{new Intl.DateTimeFormat('en-SG', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}</option>)}
              </select>
              <button type="button" aria-label="Next month" disabled={monthIndex === MONTHLY_SNAPSHOTS.length - 1} onClick={() => setSelectedIndex(MONTHLY_SNAPSHOTS[monthIndex + 1].index)}><ArrowRightIcon size={15} /></button>
            </div>
            {!isLatest && <button type="button" className="obs-latest-link" onClick={() => setSelectedIndex(SNAPSHOTS.length - 1)}>Back to latest</button>}
          </div>
        </header>

        <section id="obs-global" className="obs-hero" aria-labelledby="obs-title">
          <div className="obs-hero-story"><p className="obs-eyebrow"><span /> One community. Worldwide.</p><h1 id="obs-title">A world of<br /><em>builders.</em></h1><p className="obs-hero-deck">The people, places, and local communities building with AWS. See the bigger picture.</p><div className="obs-hero-metric" aria-live="polite" aria-atomic="true"><span>{categoryId === 'all' ? 'Across the core community' : category.label}</span><strong>{formatNumber(data.total)}<i>.</i></strong><div className="obs-metric-caption"><span>directory records</span><span className={`obs-delta ${hasComparison ? deltaClass(changes.net) : 'obs-neutral'}`}>{hasComparison ? `${formatDelta(changes.net)}${caution ? '*' : ''}` : 'Baseline'} <small>{hasComparison ? `since ${previousLabel}` : 'No earlier comparison'}</small></span></div></div><p className="obs-record-note">{categoryId === 'all' ? 'Four directories. Profiles and groups may overlap across programs.' : data.total ? 'Observed public records in this directory.' : 'This directory was not yet tracked on the selected date.'}{caution ? ' * A source change affects this comparison.' : ''}</p></div>
          <WorldMap data={data} regionRows={regions} selectedRegion={regionId} onSelectRegion={setRegionId} />
          <div className="obs-reach-strip"><span><strong>{String(regionCount).padStart(2, '0')}</strong> regions represented</span><span><strong>{data.coveragePercent}%</strong> region mapped</span><span><strong>{points.length}</strong> saved observations</span><a href="#obs-history">Explore the data <ArrowRightIcon size={17} /></a></div>
        </section>

        <nav className="obs-datasets" aria-label="Choose a directory">{DATASETS.map((entry) => { const item = getData(snapshot, entry.id); return <button type="button" key={entry.id} aria-pressed={categoryId === entry.id} className={categoryId === entry.id ? 'obs-dataset-active' : ''} onClick={() => setCategoryId(entry.id)}><span>{entry.short}</span><strong>{formatNumber(item.total)}</strong>{entry.id === categoryId && <span className="obs-tab-indicator" aria-hidden="true" />}</button>; })}</nav>

        <div id="obs-history" className="obs-analysis">
          <section className="obs-timeline" aria-labelledby="obs-history-title"><div className="obs-section-heading"><div><p className="obs-eyebrow">02 / Through time</p><h2 id="obs-history-title">The story over time.</h2></div><span className="obs-subtle-label">{category.label}<br />{formatDate(snapshot.date)}</span></div><HistoryChart points={points} selectedIndex={selectedIndex} onSelect={setSelectedIndex} label={category.label} /><dl className="obs-chart-stats"><div><dt>Peak through this date</dt><dd>{peak.date ? formatNumber(peak.total) : '—'}<small>{peak.date ? formatDate(peak.date, false) : 'Not tracked yet'}</small></dd></div><div><dt>Observed change</dt><dd className={hasComparison ? deltaClass(changes.net) : 'obs-neutral'}>{hasComparison ? formatDelta(changes.net) : '—'}<small>{hasComparison ? `vs ${previousLabel}${caution ? ' · source change' : ''}` : 'No earlier comparison'}</small></dd></div><div><dt>Identity continuity</dt><dd>{hasComparison ? `${percent(changes.retained, previous.total)}%` : '—'}<small>{hasComparison ? `${formatNumber(changes.retained)} matched records` : 'No earlier comparison'}</small></dd></div></dl></section>
          <section className="obs-regions" aria-labelledby="obs-regions-title"><div className="obs-section-heading"><div><p className="obs-eyebrow">03 / Regional reach</p><h2 id="obs-regions-title">Where we gather.</h2></div><select aria-label="Sort regions" value={regionSort} onChange={(event) => setRegionSort(event.target.value)}><option value="total">By size</option><option value="change">By change</option></select></div>{coverageChanged && <p className="obs-region-coverage">Region mapping changed from {previous.coveragePercent}% to {data.coveragePercent}%. Location updates may affect these deltas.</p>}<div className="obs-region-list">{sortedRegions.map((region, index) => <button type="button" key={region.id} className={`obs-region-row${region.id === regionId ? ' obs-region-active' : ''}`} aria-pressed={region.id === regionId} onClick={() => setRegionId(region.id)}><span className="obs-region-rank">{String(index + 1).padStart(2, '0')}</span><span className="obs-region-name">{region.label}<i><b style={{ width: `${percent(region.current, Math.max(...regions.map(({ current }) => current), 1))}%` }} /></i></span><strong>{formatNumber(region.current)}<small className={hasComparison ? deltaClass(region.net) : 'obs-neutral'}>{hasComparison ? formatDelta(region.net) : '—'}</small></strong></button>)}</div><p className="obs-region-caption">{selectedRegion?.label}: {percent(selectedRegion?.current ?? 0, data.total)}% of selected records. {formatNumber(data.unclassified)} records have no mapped region.</p></section>
        </div>

        <section className="obs-evidence" aria-label="Snapshot details and methodology">
          <details className="obs-disclosure"><summary><span className="obs-disclosure-number">04</span><span><strong>Behind the changes</strong><small>{hasComparison ? `${formatNumber(changes.added)} newly observed · ${formatNumber(changes.removed)} no longer present` : 'A starting point for future comparisons'}</small></span><span className="obs-disclosure-action">Explore identities <CaretDownIcon size={16} /></span></summary><div className="obs-disclosure-content"><p className="obs-detail-intro">{category.label} · {formatDate(snapshot.date)}. These are observed directory changes, not verified membership changes.</p>{hasComparison ? <><div className="obs-change-columns"><ChangeList title="Newly observed" items={changes.addedItems ?? []} total={changes.added} kind="added" expanded={showAllChanges} /><ChangeList title="No longer present" items={changes.removedItems ?? []} total={changes.removed} kind="removed" expanded={showAllChanges} /></div>{(changes.addedItems?.length > 5 || changes.removedItems?.length > 5) && <button className="obs-text-button" type="button" aria-expanded={showAllChanges} onClick={() => setExpandedChanges(showAllChanges ? null : changesKey)}>{showAllChanges ? 'Show fewer identities' : 'Show all saved identities'} <ArrowRightIcon size={15} /></button>}</> : <p className="obs-empty">{data.total ? 'Choose a later observation to see additions and removals.' : 'This directory was not yet tracked. Choose a later observation.'}</p>}</div></details>
          <details className={`obs-disclosure${caution ? ' obs-disclosure-caution' : ''}`}><summary><span className="obs-disclosure-number">i</span><span><strong>{caution ? 'A source change deserves a closer look' : 'A little context for these numbers'}</strong><small>{caution ? 'Directory or identity changes can resemble community growth' : 'Public snapshots, geographic coverage, and comparison confidence'}</small></span><span className="obs-disclosure-action">{quality.confidence} confidence <CaretDownIcon size={16} /></span></summary><div className="obs-disclosure-content obs-methodology"><div><h3>Reading the data</h3><p>Totals count directory records, including people and local groups. A person may appear in more than one program. Source redesigns, missing locations, and name changes can affect comparisons.</p><p>Regional deltas compare totals with the previous snapshot. Location corrections can move records between regions without adding or removing an identity.</p></div><div><h3>This observation</h3><ul>{(quality.reasons?.length ? quality.reasons : BASELINE.reasons).map((reason, index) => <li key={index}>{reason}</li>)}</ul><p>Snapshot dates use {growthHistory.snapshotTimeZone} time. Comparison confidence comes from the saved data.</p></div></div></details>
        </section>

        <section id="obs-events" className="obs-events" aria-labelledby="obs-events-title"><div className="obs-events-intro"><div><p className="obs-eyebrow">05 / Beyond the screen</p><h2 id="obs-events-title">Meet the community<span>.</span></h2><p>Good things happen when builders get together.</p></div><div className="obs-event-outlook"><strong>{upcoming.total}<span>events ahead</span></strong><p>As of {formatDate(latestDate)}<br />{upcoming.next30Days} scheduled in the following 30 days</p></div></div><div className="obs-event-grid">{upcoming.items.slice(0, 6).map((event) => <EventLink key={`${event.category}-${event.name}-${event.date}`} event={event} />)}</div>{!upcoming.items.length && <p className="obs-empty">No upcoming events were recorded in the latest observation.</p>}<p className="obs-event-note">Event outlook uses the latest saved snapshot, including when you explore history. Dates may have passed since this data was saved.</p></section>
        <footer className="obs-footer"><span className="obs-footer-mark">◎ <strong>Built around community.</strong></span><span>Public data. A shared perspective.</span><a href="#obs-global">Back to the world <ArrowUpRightIcon size={15} /></a></footer>
      </div>
    </main>
  );
}
