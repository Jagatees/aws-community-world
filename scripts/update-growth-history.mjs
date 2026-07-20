import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegionForCountry, REGIONS } from '../src/utils/countryRegions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'community-growth-history.json');
const SNAPSHOT_TIME_ZONE = process.env.GROWTH_SNAPSHOT_TIME_ZONE || 'Asia/Singapore';
const ITEM_LIMIT = 30;

const CATEGORIES = [
  { id: 'heroes', fileName: 'heroes.json', kind: 'directory' },
  { id: 'community-builders', fileName: 'community-builders.json', kind: 'directory' },
  { id: 'user-groups', fileName: 'user-groups.json', kind: 'directory' },
  { id: 'cloud-clubs', fileName: 'cloud-clubs.json', kind: 'directory' },
  { id: 'kiro-events', fileName: 'kiro-events.json', kind: 'events' },
  { id: 'community-days', fileName: 'community-days.json', kind: 'events' },
];

const TRACKED_PATHS = CATEGORIES.map((category) => `src/data/${category.fileName}`);

function formatDateInTimeZone(value, timeZone = SNAPSHOT_TIME_ZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    throw new Error(`GROWTH_SNAPSHOT_TIME_ZONE must be a valid IANA time zone, received "${timeZone}"`);
  }
}

function getSnapshotDate() {
  const value = process.env.GROWTH_SNAPSHOT_DATE || formatDateInTimeZone(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`GROWTH_SNAPSHOT_DATE must use YYYY-MM-DD, received "${value}"`);
  }
  return value;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw error;
  }
}

function readGitJson(ref, fileName) {
  try {
    const contents = execFileSync(
      'git',
      ['show', `${ref}:src/data/${fileName}`],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(contents.replace(/^\uFEFF/, ''));
  } catch {
    return [];
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeGroupName(value) {
  return normalizeText(value)
    .replace(/^aws /, '')
    .replace(/cloud club/g, 'student builder group')
    .replace(/ student builder group student builder group /g, ' student builder group ')
    .trim();
}

function normalizeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname}`.replace(/\/+$/, '').toLocaleLowerCase();
  } catch {
    return String(value).trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLocaleLowerCase();
  }
}

function getCountry(entry) {
  if (entry?.country) return String(entry.country).trim();
  const parts = String(entry?.location ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.at(-1) || null;
}

function getProfileUrl(entry) {
  return entry?.builderProfileUrl
    || entry?.profileUrl
    || entry?.hero_page_url
    || entry?.joinUrl
    || '';
}

function getRecordIdentity(categoryId, entry) {
  if (categoryId === 'community-builders') {
    return `builder:${entry.id || normalizeUrl(getProfileUrl(entry)) || normalizeText(entry.name)}`;
  }
  if (categoryId === 'heroes') return `hero:${normalizeText(entry.name)}`;
  if (categoryId === 'user-groups') return `user-group:${normalizeText(entry.name)}`;
  if (categoryId === 'cloud-clubs') return `student-group:${normalizeGroupName(entry.name)}`;
  if (categoryId === 'community-days') return `community-day:${entry.id || `${normalizeText(entry.name)}:${entry.date || ''}`}`;
  if (categoryId === 'kiro-events') return `kiro-event:${entry.id || normalizeUrl(getProfileUrl(entry)) || normalizeText(entry.name)}`;
  return `${categoryId}:${entry.id || normalizeText(entry.name)}`;
}

function toPublicItem(entry) {
  const country = getCountry(entry);
  return {
    name: entry?.name || 'Unnamed record',
    location: entry?.location || country || 'Location unavailable',
    country,
    region: getRegionForCountry(country),
    url: getProfileUrl(entry),
  };
}

function buildRecordMap(categoryId, records) {
  const map = new Map();
  for (const record of records) {
    const baseIdentity = getRecordIdentity(categoryId, record);
    let identity = baseIdentity;
    let duplicate = 2;
    while (map.has(identity)) {
      identity = `${baseIdentity}#${duplicate}`;
      duplicate += 1;
    }
    map.set(identity, record);
  }
  return map;
}

function emptyRegionCounts() {
  return Object.fromEntries(REGIONS.map((region) => [region.id, 0]));
}

function summarizeRecords(records) {
  const regions = emptyRegionCounts();
  let classified = 0;

  for (const record of records) {
    const region = getRegionForCountry(getCountry(record));
    if (!region) continue;
    regions[region] += 1;
    classified += 1;
  }

  return {
    total: records.length,
    classified,
    unclassified: records.length - classified,
    coveragePercent: records.length ? Math.round((classified / records.length) * 1000) / 10 : 0,
    regions,
  };
}

function buildState(date, source, loadRecords) {
  const categoryStates = {};
  for (const category of CATEGORIES) {
    const records = loadRecords(category);
    if (!Array.isArray(records)) throw new Error(`${category.fileName} must contain a JSON array`);
    categoryStates[category.id] = {
      records,
      map: buildRecordMap(category.id, records),
      summary: summarizeRecords(records),
    };
  }
  return { date, source, categoryStates };
}

function stateSignature(state) {
  return JSON.stringify(CATEGORIES.map((category) => {
    const categoryState = state.categoryStates[category.id];
    return [
      category.id,
      categoryState.summary,
      [...categoryState.map.keys()].sort(),
    ];
  }));
}

function getHistoricalCommits() {
  const output = execFileSync(
    'git',
    ['log', '--reverse', '--format=%H%x1f%aI%x1f%s', '--', ...TRACKED_PATHS],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  ).trim();
  if (!output) return [];

  const lastCommitByDate = new Map();
  for (const line of output.split(/\r?\n/)) {
    const [hash, timestamp, ...subjectParts] = line.split('\x1f');
    const date = formatDateInTimeZone(timestamp);
    lastCommitByDate.set(date, { hash, timestamp, subject: subjectParts.join('\x1f') });
  }
  return [...lastCommitByDate.entries()].map(([date, commit]) => ({ date, ...commit }));
}

function getChangedRecords(previousMap, currentMap) {
  const added = [];
  const removed = [];
  for (const [identity, record] of currentMap) {
    if (!previousMap.has(identity)) added.push(record);
  }
  for (const [identity, record] of previousMap) {
    if (!currentMap.has(identity)) removed.push(record);
  }
  return { added, removed };
}

function countItemsByRegion(items) {
  const counts = emptyRegionCounts();
  let unclassified = 0;
  for (const item of items) {
    const region = getRegionForCountry(getCountry(item));
    if (region) counts[region] += 1;
    else unclassified += 1;
  }
  return { regions: counts, unclassified };
}

function assessChangeQuality(category, previous, current, addedCount, removedCount) {
  if (!previous || previous.summary.total === 0) {
    return {
      confidence: 'baseline',
      comparable: false,
      reasons: [previous ? 'Dataset introduced in this snapshot.' : 'First available snapshot.'],
    };
  }

  if (category.kind === 'events') {
    return {
      confidence: 'high',
      comparable: true,
      reasons: ['Event catalogs naturally add upcoming items and remove completed events.'],
    };
  }

  const previousTotal = previous.summary.total;
  const sizeChangeRate = Math.abs(current.summary.total - previousTotal) / Math.max(1, previousTotal);
  const turnoverRate = (addedCount + removedCount) / Math.max(1, Math.max(previousTotal, current.summary.total));
  const coverageChange = Math.abs(current.summary.coveragePercent - previous.summary.coveragePercent);
  const reasons = [];
  let confidence = 'high';

  if (sizeChangeRate >= 0.12) {
    confidence = 'low';
    reasons.push(`Directory size changed ${Math.round(sizeChangeRate * 100)}%; this may reflect a source or scraper discontinuity.`);
  }
  if (turnoverRate >= 0.35) {
    confidence = 'low';
    reasons.push(`Observed identity turnover was ${Math.round(turnoverRate * 100)}%; treat additions and removals cautiously.`);
  }
  if (coverageChange >= 10) {
    if (confidence === 'high') confidence = 'medium';
    reasons.push(`Regional classification coverage changed ${Math.round(coverageChange)} percentage points.`);
  }
  if (reasons.length === 0) reasons.push('Stable directory shape and geographic coverage.');

  return { confidence, comparable: confidence !== 'low', reasons };
}

function computeChanges(category, previous, current) {
  const { added, removed } = getChangedRecords(previous?.map ?? new Map(), current.map);
  const isFirstOverallSnapshot = !previous;
  const baselineOnly = isFirstOverallSnapshot || previous.summary.total === 0;
  const visibleAdded = isFirstOverallSnapshot ? [] : added;
  const visibleRemoved = isFirstOverallSnapshot ? [] : removed;
  const addedRegionCounts = countItemsByRegion(visibleAdded);
  const removedRegionCounts = countItemsByRegion(visibleRemoved);
  const quality = assessChangeQuality(category, previous, current, visibleAdded.length, visibleRemoved.length);

  return {
    added: visibleAdded.length,
    removed: visibleRemoved.length,
    net: baselineOnly && isFirstOverallSnapshot ? 0 : current.summary.total - (previous?.summary.total ?? 0),
    retained: previous ? current.map.size - visibleAdded.length : current.map.size,
    addedByRegion: addedRegionCounts.regions,
    removedByRegion: removedRegionCounts.regions,
    addedUnclassified: addedRegionCounts.unclassified,
    removedUnclassified: removedRegionCounts.unclassified,
    addedItems: visibleAdded.map(toPublicItem).sort((a, b) => a.name.localeCompare(b.name)).slice(0, ITEM_LIMIT),
    removedItems: visibleRemoved.map(toPublicItem).sort((a, b) => a.name.localeCompare(b.name)).slice(0, ITEM_LIMIT),
    quality,
  };
}

function serializeSnapshot(state, previousState) {
  const categories = {};
  for (const category of CATEGORIES) {
    const current = state.categoryStates[category.id];
    const previous = previousState?.categoryStates[category.id];
    categories[category.id] = {
      ...current.summary,
      changes: computeChanges(category, previous, current),
    };
  }
  return { date: state.date, source: state.source, categories };
}

function getDirectPeriodChange(category, startState, endState) {
  const start = startState.categoryStates[category.id];
  const end = endState.categoryStates[category.id];
  const { added, removed } = getChangedRecords(start.map, end.map);
  const addedRegions = countItemsByRegion(added);
  const removedRegions = countItemsByRegion(removed);
  return {
    added: added.length,
    removed: removed.length,
    net: end.summary.total - start.summary.total,
    retained: end.map.size - added.length,
    retentionPercent: start.map.size ? Math.round(((end.map.size - added.length) / start.map.size) * 1000) / 10 : null,
    addedByRegion: addedRegions.regions,
    removedByRegion: removedRegions.regions,
    addedItems: added.map(toPublicItem).sort((a, b) => a.name.localeCompare(b.name)).slice(0, ITEM_LIMIT),
    removedItems: removed.map(toPublicItem).sort((a, b) => a.name.localeCompare(b.name)).slice(0, ITEM_LIMIT),
  };
}

function parseEventDate(record) {
  const value = record?.startsAt || record?.date;
  if (!value) return null;
  const date = new Date(String(value).includes('T') ? value : `${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildUpcomingAnalytics(currentState, todayDate) {
  const today = new Date(`${todayDate}T00:00:00Z`);
  const nextThirtyDays = new Date(today);
  nextThirtyDays.setUTCDate(nextThirtyDays.getUTCDate() + 30);
  const byRegion = emptyRegionCounts();
  const events = [];

  for (const categoryId of ['community-days', 'kiro-events']) {
    for (const record of currentState.categoryStates[categoryId].records) {
      const date = parseEventDate(record);
      if (!date || date < today) continue;
      const item = toPublicItem(record);
      if (item.region) byRegion[item.region] += 1;
      events.push({
        ...item,
        category: categoryId,
        date: date.toISOString(),
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return {
    total: events.length,
    next30Days: events.filter((event) => new Date(event.date) <= nextThirtyDays).length,
    byRegion,
    items: events.slice(0, 20),
  };
}

function buildAnalytics(states, snapshots) {
  const currentState = states.at(-1);
  const currentSnapshot = snapshots.at(-1);
  const categories = {};

  for (const category of CATEGORIES) {
    const startIndex = states.findIndex((state) => state.categoryStates[category.id].summary.total > 0);
    const startState = startIndex >= 0 ? states[startIndex] : states[0];
    const directChange = getDirectPeriodChange(category, startState, currentState);
    const startSummary = startState.categoryStates[category.id].summary;
    const currentSummary = currentState.categoryStates[category.id].summary;
    const regionGrowth = {};

    for (const region of REGIONS) {
      const start = startSummary.regions[region.id] ?? 0;
      const current = currentSummary.regions[region.id] ?? 0;
      regionGrowth[region.id] = {
        start,
        current,
        net: current - start,
        growthPercent: start ? Math.round(((current - start) / start) * 1000) / 10 : null,
      };
    }

    const growthLeader = Object.entries(regionGrowth)
      .sort((left, right) => right[1].net - left[1].net)[0];
    const mostRepresented = Object.entries(currentSummary.regions)
      .sort((left, right) => right[1] - left[1])[0];
    const peak = states
      .map((state) => ({ date: state.date, total: state.categoryStates[category.id].summary.total }))
      .sort((left, right) => right.total - left.total || left.date.localeCompare(right.date))[0];
    const latestMovementIndex = [...snapshots]
      .map((snapshot, index) => ({ snapshot, index }))
      .reverse()
      .find(({ snapshot }) => {
        const changes = snapshot.categories[category.id].changes;
        return changes.added > 0 || changes.removed > 0;
      })?.index;
    const latestMovement = latestMovementIndex === undefined
      ? null
      : {
          date: snapshots[latestMovementIndex].date,
          ...snapshots[latestMovementIndex].categories[category.id].changes,
        };

    categories[category.id] = {
      baselineDate: startState.date,
      currentDate: currentState.date,
      baselineTotal: startSummary.total,
      currentTotal: currentSummary.total,
      currentCoveragePercent: currentSummary.coveragePercent,
      periodChange: directChange,
      regionGrowth,
      growthLeader: growthLeader ? { region: growthLeader[0], ...growthLeader[1] } : null,
      mostRepresented: mostRepresented ? { region: mostRepresented[0], total: mostRepresented[1] } : null,
      peak,
      latestMovement,
    };
  }

  const qualityEvents = snapshots.flatMap((snapshot) => CATEGORIES.flatMap((category) => {
    const quality = snapshot.categories[category.id].changes.quality;
    if (!['low', 'medium'].includes(quality.confidence)) return [];
    return [{
      date: snapshot.date,
      category: category.id,
      confidence: quality.confidence,
      reasons: quality.reasons,
    }];
  }));

  const totalRecords = CATEGORIES.reduce(
    (sum, category) => sum + currentSnapshot.categories[category.id].total,
    0,
  );
  const classifiedRecords = CATEGORIES.reduce(
    (sum, category) => sum + currentSnapshot.categories[category.id].classified,
    0,
  );
  const firstDate = states[0].date;
  const lastDate = currentState.date;
  const daysCovered = Math.round((Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${firstDate}T00:00:00Z`)) / 86_400_000);

  return {
    period: { startDate: firstDate, endDate: lastDate, daysCovered },
    global: {
      totalRecords,
      classifiedRecords,
      coveragePercent: totalRecords ? Math.round((classifiedRecords / totalRecords) * 1000) / 10 : 0,
      snapshots: snapshots.length,
    },
    categories,
    upcoming: buildUpcomingAnalytics(currentState, currentState.date),
    qualityEvents,
  };
}

const historicalCommits = getHistoricalCommits();
const states = [];

for (const commit of historicalCommits) {
  const state = buildState(
    commit.date,
    { type: 'git', commit: commit.hash.slice(0, 7), subject: commit.subject },
    (category) => readGitJson(commit.hash, category.fileName),
  );
  if (states.length > 0 && stateSignature(state) === stateSignature(states.at(-1))) continue;
  states.push(state);
}

const workingDate = getSnapshotDate();
const workingState = buildState(
  workingDate,
  { type: 'working-tree' },
  (category) => readJson(path.join(DATA_DIR, category.fileName), []),
);

const existingDateIndex = states.findIndex((state) => state.date === workingDate);
if (existingDateIndex >= 0) states.splice(existingDateIndex, 1, workingState);
else states.push(workingState);
states.sort((left, right) => left.date.localeCompare(right.date));

const snapshots = states.map((state, index) => serializeSnapshot(state, states[index - 1]));
const existing = readJson(HISTORY_PATH, null);
const next = {
  schemaVersion: 2,
  updatedAt: existing?.updatedAt ?? null,
  snapshotTimeZone: SNAPSHOT_TIME_ZONE,
  identityMethod: 'Category-specific stable public identity, with Cloud Club and Student Builder Group names normalized across the rename.',
  snapshots,
  analytics: buildAnalytics(states, snapshots),
};

const comparableExisting = existing ? { ...existing, updatedAt: null } : null;
const comparableNext = { ...next, updatedAt: null };
if (comparableExisting && JSON.stringify(comparableExisting) === JSON.stringify(comparableNext)) {
  console.log(`Growth history is already current with ${snapshots.length} snapshots.`);
  process.exit(0);
}

next.updatedAt = new Date().toISOString();
writeFileSync(HISTORY_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Rebuilt ${snapshots.length} growth snapshots from ${historicalCommits.length} historical snapshot dates plus the working tree.`);
